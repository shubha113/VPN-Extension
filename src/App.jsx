import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Shield, Wifi, Server, Globe, Loader2, CheckCircle, XCircle, RefreshCw, MapPin, Clock } from 'lucide-react'
import { 
  fetchCurrentIP, 
  fetchProxyServers, 
  connectVPN, 
  disconnectVPN, 
  setConnecting,
  clearError,
  fetchIPLocation
} from './redux/vpnSlice'
import './App.css'

function App() {
  const dispatch = useDispatch()
  const { 
    isConnected, 
    currentIP, 
    originalIP, 
    selectedProxy, 
    proxyServers, 
    loading, 
    error,
    connectionStatus,
    locationInfo,
    lastUpdated
  } = useSelector((state) => state.vpn)

  // Initialize app
  useEffect(() => {
    dispatch(fetchCurrentIP())
    dispatch(fetchProxyServers())
  }, [dispatch])

  // Fetch location when IP changes
  useEffect(() => {
    if (currentIP) {
      dispatch(fetchIPLocation(currentIP))
    }
  }, [currentIP, dispatch])

  // Handle VPN connection/disconnection
  const handleConnection = (proxy = null) => {
    if (isConnected) {
      dispatch(disconnectVPN())
    } else if (proxy) {
      dispatch(setConnecting())
      // Simulate connection with delay
      setTimeout(() => {
        dispatch(connectVPN(proxy))
      }, 2000)
    }
  }

  // Handle proxy server selection
  const handleProxySelect = (proxy) => {
    if (!isConnected && connectionStatus !== 'connecting') {
      handleConnection(proxy)
    }
  }

  // Check if proxy is connected
  const isProxyConnected = (proxy) => {
    return isConnected && 
           selectedProxy && 
           proxy.ip === selectedProxy.ip && 
           proxy.port === selectedProxy.port;
  }

  // Format last updated time
  const formatLastUpdated = (timestamp) => {
    if (!timestamp) return ''
    const date = new Date(timestamp)
    return date.toLocaleTimeString()
  }

  return (
    <div className="app">
      <div className="vpn-container">
        {/* Header */}
        <header className="header">
          <h1>
            <Shield size={40} />
            VPN Extension
          </h1>
          <p>Secure browsing with real proxy servers</p>
        </header>

        {/* Error Message */}
        {error && (
          <div className="error">
            <p>{error}</p>
            <button onClick={() => dispatch(clearError())}>
              Dismiss
            </button>
          </div>
        )}

        {/* Connection Status */}
        <section className="status-section">
          <h2><Wifi size={24} />Connection Status</h2>
          <div className="status-info">
            <div className={`info-card ${isConnected ? 'connected' : 'disconnected'}`}>
              <h3>Status</h3>
              <p className="pulse">
                {connectionStatus === 'connecting' ? 'Connecting...' : 
                 isConnected ? 'Protected' : 'Unprotected'}
              </p>
            </div>
            <div className="info-card">
              <h3>Your IP Address</h3>
              <p>{currentIP || 'Loading...'}</p>
              {originalIP && currentIP !== originalIP && (
                <small style={{ color: '#666' }}>Original: {originalIP}</small>
              )}
            </div>
            <div className="info-card">
              <h3><MapPin size={16} style={{ display: 'inline', marginRight: '5px' }} />Location</h3>
              <p>
                {isConnected && selectedProxy ? 
                  selectedProxy.country : 
                  locationInfo ? 
                    `${locationInfo.city}, ${locationInfo.country}` : 
                    'Loading...'
                }
              </p>
              {locationInfo && locationInfo.isp && (
                <small style={{ color: '#666' }}>ISP: {locationInfo.isp}</small>
              )}
            </div>
          </div>
        </section>

        {/* Connection Control */}
        <section className="connection-section">
          <h2><Globe size={24} />Connection Control</h2>
          <div className="connection-toggle">
            <button
              className={`connect-btn ${isConnected ? 'connected' : ''} ${connectionStatus === 'connecting' ? 'connecting' : ''}`}
              onClick={() => handleConnection()}
              disabled={connectionStatus === 'connecting'}
            >
              {connectionStatus === 'connecting' ? (
                <>
                  <Loader2 size={20} className="spinner" />
                  Connecting...
                </>
              ) : isConnected ? (
                <>
                  <XCircle size={20} />
                  Disconnect VPN
                </>
              ) : (
                <>
                  <CheckCircle size={20} />
                  Select Server to Connect
                </>
              )}
            </button>
          </div>
        </section>

        {/* Proxy Servers */}
        <section className="proxy-servers">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2><Server size={24} />Available Servers</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {lastUpdated && (
                <span style={{ fontSize: '0.8rem', color: '#666' }}>
                  <Clock size={14} style={{ display: 'inline', marginRight: '4px' }} />
                  Updated: {formatLastUpdated(lastUpdated)}
                </span>
              )}
              <button
                onClick={() => dispatch(fetchProxyServers())}
                disabled={loading}
                style={{
                  background: '#4299e1',
                  color: 'white',
                  border: 'none',
                  padding: '8px 12px',
                  borderRadius: '5px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  opacity: loading ? 0.6 : 1
                }}
              >
                <RefreshCw size={16} className={loading ? 'spinner' : ''} />
                Refresh
              </button>
            </div>
          </div>
          
          {loading && proxyServers.length === 0 ? (
            <div className="loading">
              <Loader2 size={30} className="spinner" />
              <p>Loading proxy servers from APIs...</p>
            </div>
          ) : (
            <div className="servers-grid">
              {proxyServers.map((proxy) => {
                const isCurrentlyConnected = isProxyConnected(proxy);
                
                return (
                  <div
                    key={proxy.id}
                    className={`server-card ${isCurrentlyConnected ? 'selected' : ''}`}
                    onClick={() => handleProxySelect(proxy)}
                  >
                    <div className="server-header">
                      <span className="server-ip">{proxy.ip}:{proxy.port}</span>
                      <span className="server-type">{proxy.type}</span>
                    </div>
                    <div className="server-details">
                      <span>{proxy.country}</span>
                      {isCurrentlyConnected && (
                        <span style={{ color: '#38a169', fontWeight: '600' }}>
                          ✓ Connected
                        </span>
                      )}
                    </div>
                    {proxy.uptime && proxy.uptime !== 'Unknown' && (
                      <div style={{ 
                        fontSize: '0.75rem', 
                        color: '#666', 
                        marginTop: '5px' 
                      }}>
                        Uptime: {proxy.uptime}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Show loading indicator during refresh */}
          {loading && proxyServers.length > 0 && (
            <div style={{ 
              textAlign: 'center', 
              padding: '1rem',
              color: '#666' 
            }}>
              <Loader2 size={20} className="spinner" style={{ marginRight: '8px' }} />
              Refreshing server list...
            </div>
          )}
        </section>

        {/* API Information */}
        <div style={{
          backgroundColor: '#e6fffa',
          border: '1px solid #38b2ac',
          borderRadius: '10px',
          padding: '1rem',
          marginTop: '1.5rem'
        }}>
          <h4 style={{ margin: '0 0 0.5rem 0', color: '#2c7a7b' }}>
            🌐 Real API Integration
          </h4>
          <p style={{ margin: '0', fontSize: '0.9rem', color: '#2c7a7b' }}>
            This app fetches real proxy data from multiple APIs including GeoNode and ProxyScrape. 
            IP geolocation is provided by IPapi service. Data is refreshed when you click the refresh button.
          </p>
        </div>
      </div>
    </div>
  )
}

export default App
