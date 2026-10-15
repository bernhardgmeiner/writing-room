# A/B/C/D voting cards: one A4 page per letter, 4 cards per page, colours = Writing Room palette.
# Usage: python3 tools/cards.py [out.pdf]  (called by tools/build.js). Writing Room · Bernhard Gmeiner · CC BY-NC-SA 4.0
import sys
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor
W, H = A4
COL = {"A": "#1F5FD1", "B": "#C45A00", "C": "#007A5E", "D": "#B0287A"}
OUT = sys.argv[1] if len(sys.argv) > 1 else "dist/karten-abcd.pdf"
c = canvas.Canvas(OUT, pagesize=A4, invariant=1)
c.setTitle("Writing Room – Abstimmungskarten A B C D"); c.setAuthor("Bernhard Gmeiner"); c.setSubject("CC BY-NC-SA 4.0 · bernhardgmeiner.com"); c.setCreator("Writing Room"); c.setViewerPreference("DisplayDocTitle", "true")
from reportlab.pdfbase.pdfdoc import PDFString
c._doc.Catalog.Lang = PDFString("de-AT")
m = 6
cw, ch = W / 2, H / 2
for L, hexc in COL.items():
    col = HexColor(hexc)
    c.setStrokeColor(HexColor("#9AA5B4")); c.setDash(2, 3); c.setLineWidth(0.6)
    c.line(W / 2, 0, W / 2, H); c.line(0, H / 2, W, H / 2); c.setDash()
    for i in range(2):
        for j in range(2):
            x0, y0 = i * cw, j * ch
            pad = 20
            c.setStrokeColor(col); c.setLineWidth(9)
            c.roundRect(x0 + pad, y0 + pad, cw - 2 * pad, ch - 2 * pad, 18, stroke=1, fill=0)
            c.setFillColor(col)
            c.setFont("Helvetica-Bold", 250)
            tw = c.stringWidth(L, "Helvetica-Bold", 250)
            c.drawString(x0 + cw / 2 - tw / 2, y0 + ch / 2 - 88, L)
            c.setFont("Helvetica-Bold", 30)
            c.drawString(x0 + pad + 18, y0 + ch - pad - 46, L)
            c.saveState(); c.translate(x0 + cw - pad - 18, y0 + pad + 46); c.rotate(180)
            c.drawString(0, 0, L); c.restoreState()
    c.showPage()
c.save()
print("ok")
