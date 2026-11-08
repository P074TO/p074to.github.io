---
title: "Testing DNS in my homelab"
description: "A small AdGuard Home experiment made it easier to separate DNS filtering from address assignment."
pubDatetime: 2026-11-08T12:00:00+08:00
tags:
  - technical
  - homelab
---

I wanted to try network-wide ad blocking in my homelab with AdGuard Home. That
experiment turned into a question about two jobs my network does every day. Who
gives a device its IP address, and who answers when that device looks up a name?

## What I tried

I experimented with AdGuard Home's DHCP server, then tried leaving DHCP with my
existing setup and using AdGuard Home for DNS and filtering. DHCP can tell a
device which DNS server to use when it assigns an address. The device can then
send its DNS queries to AdGuard Home even though something else assigned the
address.

DNS filtering worked in that setup. I also ran into connectivity problems while
changing network settings. Since I'd changed more than one thing, I couldn't
isolate which change caused them.

## What I'll check next

I want to start from a working baseline and test one client first. I'll check
which DNS server the client is using, make a lookup, then see whether that query
appears in AdGuard Home's log. That gives me something concrete to check before
changing settings for the rest of the network.
