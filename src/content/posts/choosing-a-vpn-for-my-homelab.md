---
title: "Choosing a VPN for my homelab"
description: "How I’d compare WireGuard, Tailscale, and Headscale, and test remote access to one service before opening up more of the lab."
pubDatetime: 2026-11-08T21:00:00+08:00
tags:
  - technical
  - homelab
  - networking
---

I've been running Linux containers on Proxmox, and I wanted to understand what it
would take to reach a service when I'm away from home. A VPN could give me access
to one machine, a whole subnet, or a way to send my internet traffic through home.
Those are three different jobs. For a first test, I'd pick one low-risk service
and see if I can reach it from my laptop on a phone hotspot.

## Table of contents

## What would I actually self-host?

The tunnel carries traffic between devices. Coordination is the work of enrolling
devices, telling them how to find each other, and distributing access rules. Where
those jobs run is the most useful distinction I found between the three options.

- **WireGuard** gives me the tunnel. I'd configure the peers, keys, endpoints,
  and routes myself. If the home peer is behind carrier-grade NAT, I'd need to
  establish some reachable path between the peers. A port forward on my own router
  can only affect the NAT that router controls.
  [WireGuard quick start](https://www.wireguard.com/quickstart/)
- **Tailscale** runs WireGuard tunnels on the devices and provides a hosted
  coordination service. It tries to establish a direct connection, with relay
  paths available when the networks make that difficult. That makes it a useful
  baseline when I'm still figuring out how reachable the lab is from outside.
  [Control and data planes](https://tailscale.com/docs/concepts/control-data-planes)
  · [Connection types](https://tailscale.com/docs/reference/connection-types)
- **Headscale** lets me run the coordination server for compatible Tailscale
  clients. I'd also be responsible for keeping that service reachable, renewing
  its TLS certificate or managing the automation that renews it, and backing up
  its state. The project's setup guide expects a publicly reachable server
  serving HTTPS.
  [Headscale overview](https://headscale.net/stable/)
  · [Setup requirements](https://headscale.net/stable/setup/requirements/)

## Start with one device and one port

I'd start with Tailscale on a lab node that can run the client and serve a test
page, then enroll the laptop as the second device. I'd scope the access policy to
the client, the lab node, and the service port. That gives me a small enough
configuration to test without forwarding the Proxmox management interface from
the router. [Tailscale access grants](https://tailscale.com/docs/features/access-control/grants)

A **subnet router** becomes relevant when I need to reach a device that can't run
the client, such as a separate appliance on the LAN. An **exit node** is for a
different job. It carries a client's internet-bound traffic through the selected
node. Both would change more of the network than this first test needs.
[Subnet routers](https://tailscale.com/docs/features/subnet-routers)
· [Exit nodes](https://tailscale.com/docs/features/exit-nodes)

## Verify the path from outside

With the laptop on a hotspot and both devices enrolled, I'd run the following
from the laptop. The peer name and HTTPS URL are placeholders. The URL should
point to a test endpoint on that peer with a certificate the laptop trusts.

```bash
peer="lab-node"
service_url="https://lab-node.example.invalid/"

# Check which peers the client knows about and whether the node responds.
tailscale status
tailscale ping --c=3 --timeout=3s "$peer"

# Check the application separately from the tunnel.
curl --silent --show-error --connect-timeout 5 --max-time 10 \
  --output /dev/null --write-out 'HTTP %{http_code}\n' -- "$service_url"
```

A reply from `tailscale ping` tells me I can reach the peer over Tailscale. It
also helps distinguish a direct path from a relayed one. The `curl` request
checks more of what matters to me. It has to resolve the name, open a connection
to the service, and complete TLS before it can get an HTTP response. A `200` from
the test endpoint is the outcome I'd record. A `401` or `403` means an HTTP server
responded and rejected the request. If the peer responds but the service times
out, I'd check the service's listening address and port, the access policy, and
the host firewall.
[Tailscale CLI reference](https://tailscale.com/docs/reference/tailscale-cli#ping)
· [curl manual](https://curl.se/docs/manpage.html)

I'd repeat the test from a client that shouldn't have access before using the
same setup for anything sensitive. For the lab notes, I'd record the network I
tested from, whether the path was direct or relayed, and the HTTP status. That
gives me a baseline I can compare against later if I add a subnet route or try
running the coordination server myself.
