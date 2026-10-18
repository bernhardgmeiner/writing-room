# Writing Room

**Online verwenden:** https://writing.bernhardgmeiner.com/

**Direkt verwenden:** `index.html` ist das fertige Werkzeug (eine Datei, offline, im Browser öffnen), `karten-abcd.pdf` sind die Abstimmungskarten zum Ausdrucken. Alles Weitere in diesem Repository ist der Quellcode dazu.


Ein Beamer-Werkzeug für den Englischunterricht an der AHS (5. bis 12. Schulstufe, Niveau A1 bis B2). Die Klasse baut gemeinsam einen Modelltext, Entscheidung für Entscheidung: Am Beamer stehen zwei bis vier Bausteine, die Schüler:innen stimmen mit A/B/C/D-Karten ab, die Lehrkraft klickt die Mehrheit an. Manche Bausteine sind Fallen; die „Redaktion“ lehnt sie mit einer kurzen Begründung ab.

Autor: Bernhard Gmeiner (bernhardgmeiner.com). Lizenz: CC BY-NC-SA 4.0 (https://creativecommons.org/licenses/by-nc-sa/4.0/deed.de). Die eingebetteten Schriften stehen unter der SIL Open Font License 1.1 (Texte in `tools/fonts/`).

## Verwenden

`dist/writing-room.html` (nach dem Bauen) ist die fertige Datei: doppelklicken, im Browser öffnen, Vollbild. Sie braucht keine Internetverbindung und überträgt keine Daten. Gespeicherte Stunden bleiben nur im Browser dieses Geräts.

Am Ende jedes Pakets der 9. bis 12. Schulstufe stehen ein Link und ein QR-Code zur passenden Seite des Matura-Guides „Don’t Panic, It’s Just the Matura“ (https://matura.bernhardgmeiner.com), damit Schüler:innen zuhause weiterüben können. Der QR-Code ist in die Datei eingebettet; erst wer den Link öffnet, geht ins Internet.

## Aufbau

- `packs/*.json` – 72 Schreibpakete (Inhalt, Fallen, Lehrkraft-Hinweise)
- `engine/engine.html` – die App
- `tools/validate.js` – prüft ein Paket über alle möglichen Wege: `node tools/validate.js packs/<id>.json --samples 2`
- `tools/build.js` – baut `dist/writing-room.html`: `node tools/build.js` (Node.js 18+, Python 3 mit reportlab für die Kartenvorlage)
- `tools/dump.js`, `tools/gradecheck.py` – lesbare Ausgabe eines Pakets, Abgleich innerhalb einer Schulstufe
- `tools/guide-qr.js` – schreibt die QR-Codes für die Links zum Matura-Guide in die Engine (`npm install qrcode`, dann `node tools/guide-qr.js`)
- `AUTHORING.md` – Regeln für neue Pakete (Englisch)

## Entstehung und KI

Die Modelltexte, Optionen, Fallen und Hinweise für Lehrkräfte wurden mit Unterstützung von KI (Claude von Anthropic) geschrieben. Konzept, Auswahl und Regeln stammen vom Autor. Alle Pakete wurden automatisch (`tools/validate.js`) und in mehreren KI-gestützten Prüfdurchgängen kontrolliert. Die Qualitätssicherung ersetzt keine fachliche Prüfung durch die Lehrkraft.

## Sicherheit der Datei

Die Datei enthält eine Content-Security-Policy mit den Hashes der beiden Skripte. Wer die HTML-Datei von Hand ändert, muss die Hashes neu berechnen (`node tools/build.js`) oder die Zeile `Content-Security-Policy` entfernen.

## Regeln in Kürze

Oberstufe (9. bis 12. Schulstufe): jeder Text hat genau fünf Absätze (Introduction, Body paragraph 1 bis 3, Conclusion); die lange Fassung verlängert Absätze, sie fügt keine hinzu. Jede Kombination von Bausteinen ergibt einen zusammenhängenden Text. Keine Bezüge zu Lehrwerken, Klassen oder Schulen. Alle handelnden Personen, Schulen, Firmen, Vereine, Medien und Veranstaltungen sind erfunden; reale Orte und öffentlich bekannte Tatsachen dienen nur als Kulisse. E-Mail-Adressen enden auf `.example`.
