# Evo Platformer

3D platformska igra o bitju, ki se bori, zbira evolucijske izboljšave in razvija svojo obliko.

## Zagon lokalno

Repozitorij odpri v VS Code in zaženi lokalni spletni strežnik v mapi projekta:

```sh
python3 -m http.server 8123
```

Igro odpri na `http://localhost:8123`.

## Razvoj in zdravje

Izboljšave so razporejene v štiri povezane smeri: telesni načrt, gibanje in življenjski prostor, bojni slog ter preživetje. V premoru odpri radialno drevo: začetna sluz je v sredini, veje vodijo do nadaljnjih prilagoditev, barva vozlišča označuje njegovo nišo. Nekatere napredne prilagoditve zahtevajo kombinacijo več prej izbranih lastnosti; pogoje vidiš ob pomiku kazalca nad vozlišče. Omejitve so prikazane posebej, zato izbira ene lastnosti ne zapre več samodejno vseh sorodnih vej.

Med izbiro izboljšave so prikazane trenutne statistike stvora. Če stopnjo zaključiš z največ petino zdravja, se v naslednji stopnji pojavi drevo: sadež dozori, pade na tla in ob dotiku povrne petino največjega zdravja (zaokroženo navzdol, najmanj 1).

## Dnevno-nočni cikel

Med igranjem se v štirih minutah izmenjajo dan, mrak, noč in zora: dan in noč trajata po 90 sekund, mrak in zora pa po 30 sekund. Sonce in luna potujeta čez nebo; lunine mene se ponovijo na vsakih osem dnevno-nočnih ciklov. Oblaki mehčajo dnevno svetlobo, noč brez mesečine pa je posebej temna. Spreminjajo se nebo, osvetlitev, zvezde in kresničke, ambient pa podnevi poudari ptičje petje, ponoči pa čričke. Cikla se med premorom ustavita in shranita z igro; ne spreminjata sovražnikov, škode ali nagrad.

Nekateri nivoji imajo reko in slap v ozadju; več vodnih prilagoditev poveča možnost mokrega nivoja. Ob zaključku stopnje z največ petino zdravja se v naslednjem nivoju pojavi cvetoče drevo. Cvet se približno minuto razvija, odvrže cvetne liste, nato sadež zraste, pade in postane užiten.

## Objava na spletu

Delovni tok GitHub Actions objavi igro na GitHub Pages ob vsaki spremembi veje `main`. Če GitHub Pages še ni nastavljen, v repozitoriju odpri **Settings → Pages** in pri **Build and deployment → Source** izberi **GitHub Actions**. Po uspešni objavi bo igra na naslovu `https://jimi003.github.io/evo-platformer/`.

Spletna stran in datoteke, vključene v objavo, bodo javno dostopne. Repozitorij lahko ostane zaseben, če to omogoča GitHubov paket; pri paketu GitHub Free mora biti repozitorij za Pages javen. Če GitHub zahteva javni repozitorij, ga ne spreminjaj brez premisleka, saj bi bila javna tudi izvorna koda.
