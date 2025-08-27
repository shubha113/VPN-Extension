import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import axios from "axios";

// Fetch user's current IP
export const fetchCurrentIP = createAsyncThunk(
  'vpn/fetchCurrentIP',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axios.get('https://api.ipify.org?format=json')
      return response.data.ip
    } catch (error) {
      return rejectWithValue('Failed to fetch IP')
    }
  }
)

// Fetch proxy servers with multiple APIs for reliability
export const fetchProxyServers = createAsyncThunk(
  'vpn/fetchProxyServers',
  async (_, { rejectWithValue }) => {
    try {
      const proxyApis = [
        {
          url: 'https://proxylist.geonode.com/api/proxy-list?limit=50&page=1&sort_by=lastChecked&sort_type=desc&protocols=http%2Chttps',
          parser: (data) => data.data?.map((proxy, index) => ({
            id: `geonode_${index}`,
            ip: proxy.ip,
            port: proxy.port,
            country: proxy.country || 'Unknown',
            type: proxy.protocols?.[0]?.toUpperCase() || 'HTTP',
            speed: proxy.speed || 'Unknown',
            uptime: proxy.upTime || 'Unknown'
          })) || []
        },
        {
          url: 'https://api.proxyscrape.com/v2/?request=getproxies&protocol=http&timeout=10000&country=all&format=textplain',
          parser: (data) => {
            const lines = data.split('\n').filter(line => line.trim());
            return lines.slice(0, 15).map((line, index) => {
              const [ip, port] = line.trim().split(':');
              return {
                id: `proxyscrape_${index}`,
                ip,
                port,
                country: 'Global',
                type: 'HTTP',
                speed: 'Unknown',
                uptime: 'Unknown'
              };
            });
          }
        }
      ];

      // Try first API (GeoNode)
      try {
        const response = await axios.get(proxyApis[0].url, {
          timeout: 10000,
          headers: { 'Accept': 'application/json' }
        });
        
        const proxies = proxyApis[0].parser(response.data);
        if (proxies && proxies.length > 0) {
          return proxies.slice(0, 15);
        }
      } catch (error) {
        console.warn('Primary API failed, trying fallback...');
      }

      // Try fallback API (ProxyScrape)
      const response = await axios.get(proxyApis[1].url, { timeout: 10000 });
      const proxies = proxyApis[1].parser(response.data);
      return proxies;
      
    } catch (error) {
      return rejectWithValue('Failed to fetch proxy servers');
    }
  }
)

// Get IP location
export const fetchIPLocation = createAsyncThunk(
  'vpn/fetchIPLocation',
  async (ip, { rejectWithValue }) => {
    try {
      const response = await axios.get(`https://ipapi.co/${ip}/json/`, {
        timeout: 5000
      });
      
      return {
        country: response.data.country_name,
        city: response.data.city,
        isp: response.data.org
      };
    } catch (error) {
      return rejectWithValue('Failed to fetch location');
    }
  }
);

const initialState = {
  isConnected: false,
  currentIP: null,
  originalIP: null,
  selectedProxy: null,
  proxyServers: [],
  loading: false,
  error: null,
  connectionStatus: 'disconnected',
  locationInfo: null,
  lastUpdated: null
}

const vpnSlice = createSlice({
  name: 'vpn',
  initialState,
  reducers: {
    connectVPN: (state, action) => {
      state.isConnected = true
      state.selectedProxy = action.payload
      state.currentIP = action.payload.ip
      state.connectionStatus = 'connected'
      state.loading = false
      state.error = null
    },
    
    disconnectVPN: (state) => {
      state.isConnected = false
      state.selectedProxy = null
      state.currentIP = state.originalIP
      state.connectionStatus = 'disconnected'
      state.error = null
      state.locationInfo = null
    },
    
    setConnecting: (state) => {
      state.connectionStatus = 'connecting'
    },
    
    clearError: (state) => {
      state.error = null
    }
  },
  
  extraReducers: (builder) => {
    builder
      // Current IP
      .addCase(fetchCurrentIP.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchCurrentIP.fulfilled, (state, action) => {
        state.loading = false
        state.currentIP = action.payload
        if (!state.originalIP) {
          state.originalIP = action.payload
        }
      })
      .addCase(fetchCurrentIP.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload
      })
      
      // Proxy servers
      .addCase(fetchProxyServers.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchProxyServers.fulfilled, (state, action) => {
        state.loading = false
        state.proxyServers = action.payload
        state.lastUpdated = new Date().toISOString()
      })
      .addCase(fetchProxyServers.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload
      })

      // IP Location
      .addCase(fetchIPLocation.fulfilled, (state, action) => {
        state.locationInfo = action.payload
      })
  },
})

export const { connectVPN, disconnectVPN, setConnecting, clearError } = vpnSlice.actions
export default vpnSlice.reducer
