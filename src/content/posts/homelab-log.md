---
title: "Homelab log"
description: "A running log of my ThinkPad homelab, from rebuilding it with Proxmox to figuring out how to recover what I run on it."
pubDatetime: 2026-11-08T22:35:51+08:00
tags:
  - homelab
  - retrospective
---

The oldest home-server thread I have is dated August 18, 2026. The first detailed
notes I could recover are from September 3, when I was preparing to rebuild my
ThinkPad X220. This is where I’m keeping track of what I try, what breaks, and
what I’d do differently as the lab grows.

## Where things stand

The X220 runs Proxmox, and I’ve been using Linux containers to run services and
learn how the pieces fit together. The next thing I want to be able to answer is
what happens if the laptop stops working. That means getting an encrypted copy
of the important data off the machine and trying a restore somewhere else. I
also want to test remote access from outside the house with one low-risk
service first.

## Log

### November 7, 2026 — Remote access and recovery

Running Vaultwarden made the cost of downtime more concrete. If the laptop
fails, I want to know how I’d get the vault running somewhere else. On the
network side, I looked at WireGuard, Tailscale, and Headscale and narrowed the
first remote-access test to one service on a separate connection.

[Choosing a VPN for my homelab](/posts/choosing-a-vpn-for-my-homelab/)

### November 6, 2026 — Planning backups I can restore

I started mapping out what I’d need to recover after a rebuild. The list
included the Proxmox host configuration, service data, and Caddy’s local
certificate authority. The plan is to keep an encrypted copy off the ThinkPad
and test the restore separately.

### September 22, 2026 — A coursework VM hits a kernel panic

I tried moving a coursework VM from VirtualBox to Proxmox. It reached the
kernel, then stopped because it couldn’t mount its root filesystem. I wanted to
check the virtual disk controller and boot settings against the original VM
before changing anything inside the guest.

### September 14, 2026 — Separating DNS from DHCP

I tried running AdGuard Home for DNS and filtering while leaving address
assignment with my existing DHCP setup. Filtering worked, but I also ran into
connectivity problems while changing network settings. I came away wanting a
known baseline and one client to test on before changing settings for everyone.

[Testing DNS in my homelab](/posts/testing-dns-in-my-homelab/)

### September 8, 2026 — Running Proxmox and Linux containers

By this point I was running Proxmox and LXCs. I’d been making changes as I went
and had very little written down. I wanted a record I could come back to later
and use to explain how I got from one setup to the next.

### September 3, 2026 — Saving the old setup before rebuilding

Before replacing Debian with Proxmox on the ThinkPad, I collected the network,
DNS, container, proxy, and monitoring configuration into a snapshot. I copied
it to a separate USB drive with a manifest and checksums. That gave me a copy
of the setup I could refer to while rebuilding.
