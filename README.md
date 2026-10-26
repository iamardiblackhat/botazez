<div align="center">

<img src="public/ardi-logo.png" width="160" alt="BOTAZEZ — ARDI Logo" style="border-radius: 50%; drop-shadow: 0 0 20px rgba(0, 229, 255, 0.4);" />

# BOTAZEZ

### Real-Time Global Intelligence Platform & Situational Awareness Dashboard

[![Live Production](https://img.shields.io/badge/Production-botazez.com-00E5FF?style=for-the-badge&logo=vercel&logoColor=white)](https://botazez.com)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://typescriptlang.org)
[![MapLibre](https://img.shields.io/badge/MapLibre_GL-GPU_Accelerated-396CB2?style=for-the-badge)](https://maplibre.org)
[![License](https://img.shields.io/badge/License-MIT-D4AF37?style=for-the-badge)](LICENSE)

**A unified, GPU-accelerated command surface for real-time global monitoring — tracking 10,000+ flights, 2,000+ orbital satellites, global CCTV networks, seismic activity, active wildfires, cyber threats, and geopolitical conflict zones in 3D WebGL.**

[Live Platform](https://botazez.com) · [Features](#key-capabilities) · [Architecture](#architecture) · [Quick Start](#quick-start)

</div>

---

## Overview

**BOTAZEZ** is an open-source intelligence (OSINT) and global situational awareness platform built with **Next.js 16**, **MapLibre GL**, and **WebGL**. It provides sovereign, real-time command-and-control intelligence across aerospace, maritime, critical infrastructure, cyber warfare, and environmental domains at 60fps.

Powered by the **ARDI** autonomous reconnaissance and defense engine, BOTAZEZ fuses multi-source open data into actionable operational signal.

---

## Key Capabilities

| Intelligence Domain | Tracked Data & Scope | Data Providers / Feeds |
|---|---|---|
| ✈️ **Aerospace & Flights** | Commercial, private, military, and state aircraft | OpenSky Network, ADS-B |
| 🛰️ **Orbital Lattice** | 2,000+ live satellites, ISS, Starlink, orbital tracks | Space-Track, CelesTrak, TLE Propagation |
| 📹 **Worldwide CCTV** | 2,000+ public cameras with live stream previews | TfL, WSDOT, Caltrans, NYC DOT, VicRoads |
| 🌋 **Seismic & Earthquakes** | Real-time seismic events M2.5+, depth & shake radius | USGS Global Seismic Network |
| 🔥 **Wildfire & Thermal** | Global active fire hotspots & thermal anomalies | NASA FIRMS (VIIRS / MODIS) |
| ⚔️ **Conflict Zones** | Active battlefronts, kinetic clashes, territorial control | Live Geopolitical Intel, ACLED |
| 🛡️ **Cyber Defense & Threat Intel** | Known exploited vulnerabilities (KEV), CVE feeds, scans | CISA KEV, NVD, SANS Internet Storm Center |
| 🌊 **Maritime & Chokepoints** | 39 strategic ports, 10 key maritime choke points | AIS Global Naval Coordinates |
| ⚡ **Space Weather** | Geomagnetic storm index (Kp-index), solar flare alerts | NOAA Space Weather Prediction Center (SWPC) |
| 📡 **BOTAZEZ Recon Toolkit** | Nmap scanner, WHOIS, DNS records, SSL certs, BGP routing | Custom Hardened Recon API |
| 📊 **Global Markets & SCM** | Commodities, defense equities, crypto, supply chains | Multi-market real-time tickers |

---

## Architecture

```
┌───────────────────────────────────────────────────────────────┐
│                     BOTAZEZ CLIENT                            │
│  ┌────────────────────┐  ┌─────────────────────────────────┐ │
│  │   MapLibre GL      │  │        HUD Overlay Layer         │ │
│  │  3D Globe Engine   │  │  - Global Status Bar & Ticker   │ │
│  │  WebGL Accelerated │  │  - ARDI Operations Panel         │ │
│  │  Dynamic Shaders   │  │  - BOTAZEZ Recon Suite          │ │
│  └────────────────────┘  └─────────────────────────────────┘ │
├───────────────────────────────────────────────────────────────┤
│                     NEXT.JS API ENGINE                        │
│  /api/flights      /api/satellites      /api/cyber-threats    │
│  /api/cctv         /api/earthquakes     /api/conflicts        │
│  /api/fires        /api/maritime        /api/weather          │
└───────────────────────────────────────────────────────────────┘
```

---

## Tech Stack

| Component | Technology |
|---|---|
| **Framework** | Next.js 16 (App Router) |
| **Language** | TypeScript 5 |
| **Map Rendering** | MapLibre GL JS (WebGL GPU-accelerated) |
| **Styling & HUD** | Custom Cyberpunk / Tactical Glassmorphism Design System |
| **Animations** | Framer Motion |
| **Icons** | Lucide React |
| **Deployment** | Vercel Global Edge Network |

---

## Quick Start

### Prerequisites
- Node.js 18+ (Node.js 20+ recommended)
- npm or pnpm

### 1. Clone & Install
```bash
git clone https://github.com/iamardiblackhat/botazez.git
cd botazez
npm install
```

### 2. Environment Setup
Create a `.env.local` file:
```env
NEXT_PUBLIC_SITE_URL=https://botazez.com
# Optional API Keys for enhanced feed limits:
# OPENSKY_USERNAME=...
# OPENSKY_PASSWORD=...
# GROQ_API_KEY=...
```

### 3. Run Locally
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `3D` / `2D` | Toggle between 3D Globe and 2D Mercator Projection |
| `MAP` / `SAT` | Switch between Tactical Dark and High-Res Satellite basemap |
| `F` | Toggle flight tracking layer |
| `E` | Toggle earthquake & seismic layer |
| `S` | Toggle orbital satellite tracks |
| `O` | Launch ARDI AI intelligence assistant |
| `I` | Toggle live OSINT intelligence feed |
| `M` | Toggle financial & commodity markets panel |
| `Esc` | Close open overlay panels |

---

## License

This project is licensed under the [MIT License](LICENSE).

<div align="center">

**[BOTAZEZ](https://botazez.com)** — Autonomous Recon & Defense Intelligence

</div>
