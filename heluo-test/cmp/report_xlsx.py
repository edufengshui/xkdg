# Crea HeLuo_violenti_allargato.xlsx dai risultati di violent2.js e dai dati nuovi
import json, csv, glob, os
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment
D = os.path.dirname(os.path.abspath(__file__))
S = json.load(open(f'{D}/violent2_summary.json'))
P = json.load(open(f'{D}/../famous_violent.json'))
wb = Workbook(); F = Font(name='Arial', size=10); B = Font(name='Arial', size=10, bold=True)
H = PatternFill('solid', fgColor='DDE4EE'); G = PatternFill('solid', fgColor='E2F0D9')
def put(ws, r, vals, font=F, fill=None):
    for c, v in enumerate(vals, 1):
        x = ws.cell(r, c, v); x.font = font
        if fill: x.fill = fill
ws = wb.active; ws.title = 'Riepilogo'
put(ws, 1, ['He Luo Li Shu — test eventi violenti allargato (modo stretto: escluse ore deboli). D = media positivi − media violenti; p = permutazione 20.000, unilaterale; soglia Bonferroni 0,05/15 = 0,0033'], B)
r = 3
for lab in ['VECCHI', 'NUOVI (replica)', 'NUOVI vs trionfi nuovi', 'TUTTI']:
    L = S[lab]; put(ws, r, [f'{lab} — {L[0]["nv"]} violenti vs {L[0]["np"]} positivi'], B); r += 1
    put(ws, r, ['Livello', 'Media violenti', 'Media positivi', 'D', 'p', 'p Holm', '% violenti con testo sfavorevole', '% violenti con testo favorevole'], B, H); r += 1
    for x in L:
        put(ws, r, [x['k'], round(x['mv'], 2), round(x['mp'], 2), round(x['D'], 2), round(x['p'], 4), round(x['pHolm'], 3), x['sfav'] / 100, x['fav'] / 100],
            fill=G if x['k'] in ('C.cycle', 'C.yearHex') else None)
        ws.cell(r, 7).number_format = ws.cell(r, 8).number_format = '0%'; r += 1
    r += 1
put(ws, r, ['In verde le due ipotesi nate dal primo test (metodo C: ciclo 6/9 anni ed esagramma annuale). Sui soli eventi nuovi nessuna delle due si conferma.'], F)
for c, w in zip('ABCDEFGH', [14, 14, 14, 8, 9, 9, 22, 22]): ws.column_dimensions[c].width = w
# dettaglio
ws = wb.create_sheet('Dettaglio violenti')
rows = list(csv.reader(open(f'{D}/violent2_dettaglio.csv')))
put(ws, 1, rows[0], B, H)
for i, row in enumerate(rows[1:], 2):
    put(ws, i, [int(v) if v.lstrip('-').isdigit() else v for v in row])
ws.column_dimensions['B'].width = 26; ws.column_dimensions['D'].width = 50; ws.freeze_panes = 'E2'
# personaggi nuovi
ws = wb.create_sheet('Personaggi nuovi')
put(ws, 1, ['Nome', 'Sesso', 'Data nascita', 'Ora', 'Fuso usato', 'Luogo', 'Lat', 'Lon', 'Rodden', 'Ora debole', 'Violenti', 'Trionfi', 'Fonte nascita', 'Note'], B, H)
for i, p in enumerate(P['people'], 2):
    b = p['birth']; ev = p['events']
    put(ws, i, [p['name'], p['sex'], b['date'], b['time'], b['tz'], b['place'], b['lat'], b['lon'], b['rodden'], 'sì' if p['weakTime'] else '',
                sum(e['violent'] for e in ev), sum(e['polarity'] == '+' for e in ev), b['source'], b['notes']])
ws.column_dimensions['A'].width = 30; ws.column_dimensions['F'].width = 28; ws.column_dimensions['M'].width = 50; ws.freeze_panes = 'B2'
# eventi nuovi con fonte
ws = wb.create_sheet('Eventi nuovi')
put(ws, 1, ['Persona', 'Data', 'Tipo', 'Evento', 'Fonte'], B, H); i = 2
for p in P['people']:
    for e in sorted(p['events'], key=lambda e: e['date']):
        put(ws, i, [p['name'], e['date'], 'violento' if e['violent'] else ('trionfo' if e['polarity'] == '+' else 'negativo'), e['what'], e['source']]); i += 1
ws.column_dimensions['A'].width = 30; ws.column_dimensions['D'].width = 70; ws.column_dimensions['E'].width = 60; ws.freeze_panes = 'A2'
# esclusi
ws = wb.create_sheet('Esclusi')
put(ws, 1, ['Gruppo', 'Candidato e motivo'], B, H); i = 2
for f in sorted(glob.glob(f'{D}/../new/g*-esclusi.txt')):
    for line in open(f):
        if line.strip(): put(ws, i, [os.path.basename(f)[:2], line.strip()]); i += 1
for d in P['meta']['dropped']: put(ws, i, ['evento tolto', f'{d[0]} {d[1]}: {d[2]}']); i += 1
ws.column_dimensions['B'].width = 100
wb.save(f'{D}/../HeLuo_violenti_allargato.xlsx'); print('ok')
