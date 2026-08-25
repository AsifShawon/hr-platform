# HR Platform On-Premises MVP: Deployment Prerequisites

## 1. Hardware Requirements

| Resource              | Minimum Specification     | Recommended Production Pilot                      |
| --------------------- | ------------------------- | ------------------------------------------------- |
| **Processor**         | 4 Cores x86_64 / amd64    | 8 Cores x86_64 (e.g. Intel Core i7 / AMD Ryzen 7) |
| **System RAM**        | 4 GB RAM                  | 8 GB – 16 GB ECC RAM                              |
| **Storage**           | 20 GB free SSD storage    | 100 GB NVMe SSD storage                           |
| **Network Interface** | 100 Mbps Ethernet / Wi-Fi | 1 Gbps Ethernet + Isolated Factory Wi-Fi AP       |
| **Display**           | 1280 × 800 resolution     | 1920 × 1080 resolution                            |

---

## 2. Operating System & Software Support

### Supported Operating Systems

- **Windows**: Windows 10 Pro / Enterprise (64-bit, Build 19044+), Windows 11 Pro / Enterprise (64-bit), Windows Server 2022.
- **Linux**: Ubuntu 22.04 LTS / 24.04 LTS (x86_64), Debian 12 (x86_64), RHEL 9 / Rocky Linux 9.

### Required Software Components

1. **Docker Engine**: Version 24.0.0 or higher.
2. **Docker Compose**: Version 2.20.0 or higher (built into modern Docker Desktop / `docker-compose-plugin`).
3. **Web Browser**: Modern Chromium (Chrome 120+, Edge 120+) or Firefox (120+) with WebRTC / Camera support.

---

## 3. Network, Firewall & Port Configuration

| Port       | Protocol    | Scope                                     | Direction | Purpose                                                     |
| ---------- | ----------- | ----------------------------------------- | --------- | ----------------------------------------------------------- |
| **`80`**   | TCP / HTTP  | Host Loopback (Initial) $\to$ Factory LAN | Inbound   | HTTP Web Traffic (Auto-redirects to HTTPS when LAN enabled) |
| **`443`**  | TCP / HTTPS | Host Loopback (Initial) $\to$ Factory LAN | Inbound   | Secure HTTPS Web UI, API, and Mobile Camera Capture         |
| **`3000`** | TCP         | Internal Mesh Only                        | N/A       | Next.js Frontend (Zero host port binding)                   |
| **`3001`** | TCP         | Internal Mesh Only                        | N/A       | Fastify API Server (Zero host port binding)                 |
| **`5432`** | TCP         | Internal Mesh Only                        | N/A       | PostgreSQL Database (Zero host port binding)                |

> [!CAUTION]
> Under no circumstances should port `5432` (PostgreSQL) or port `3001` (API) be directly mapped to the host network interface. All inbound traffic must terminate at Caddy on ports `80` and `443`.
