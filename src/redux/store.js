import { configureStore } from "@reduxjs/toolkit";
import vpnSlice from "./vpnSlice";

// Configure Redux store with VPN slice
const store = configureStore({
    reducer:{
        vpn: vpnSlice
    }
})

export default store;