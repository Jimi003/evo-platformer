# Evo Platformer

3D platformska igra o bitju, ki se bori, zbira evolucijske izboljšave in razvija svojo obliko.

## Zagon lokalno

Repozitorij odpri v VS Code in zaženi lokalni spletni strežnik v mapi projekta:

```sh
python3 -m http.server 8123
```

Igro odpri na `http://localhost:8123`.

## Razvoj in zdravje

Izboljšave so razporejene v štiri povezane smeri: telesni načrt, gibanje in življenjski prostor, bojni slog ter preživetje. V premoru odpri radialno drevo: v sredini je ime tvoje glavne nišne specializacije, obarvana vozlišča pa kažejo nišo posamezne prilagoditve. Drevo lahko premikaš z vlečenjem in približaš ali oddaljiš z miškinim koleščkom; oblika vozlišča označuje njegovo razvojno smer. Nekatere napredne prilagoditve zahtevajo kombinacijo več prej izbranih lastnosti; pogoje vidiš ob pomiku kazalca nad vozlišče. Kartice in drevo prikazujejo le veje, ki so ob upoštevanju že izbranih nezdružljivih prilagoditev še dosegljive.

Med izbiro izboljšave so prikazane trenutne statistike stvora. Lik obračaš z vlečenjem miške; levi klik napade, desni pa izvede odklenjeni sunek. Telesna oblika se postopno razvija z vlaganjem v niše in prilagoditve: okončine se podaljšujejo z razvojem, perje in krila pa dobivajo več podrobnosti. Če stopnjo zaključiš z največ petino zdravja, se v naslednji stopnji pojavi drevo: sadež dozori, pade na tla in ob dotiku povrne petino največjega zdravja (zaokroženo navzdol, najmanj 1).

V nekaterih stopnjah se pojavi skriti brlog, povezan z eno od tvojih razvitih niš. Poišči kamniti vhod, se mu približaj in pritisni **F**; ob zaključku stopnje dobiš do tri ponudbe starodavnih, edinstvenih prilagoditev in izbereš eno. Šefi se izmenjujejo med Tiranom, Koreninsko matriarhinjo in Nevihtnim zmajem, vsak z drugačnim videzom in napovedanimi napadi.

## Dnevno-nočni cikel

Med igranjem se v štirih minutah izmenjajo dan, mrak, noč in zora: dan in noč trajata po 90 sekund, mrak in zora pa po 30 sekund. Sonce in luna potujeta čez nebo; lunine mene se ponovijo na vsakih osem dnevno-nočnih ciklov. Oblaki mehčajo dnevno svetlobo, noč brez mesečine pa je posebej temna. Spreminjajo se nebo, osvetlitev, zvezde in kresničke, ambient pa podnevi poudari ptičje petje, ponoči pa čričke. Cikla se med premorom ustavita in shranita z igro; ne spreminjata sovražnikov, škode ali nagrad.

Nekateri nivoji imajo reko in slap v ozadju; več vodnih prilagoditev poveča možnost mokrega nivoja. Ob zaključku stopnje z največ petino zdravja se v naslednjem nivoju pojavi cvetoče drevo. Cvet se približno minuto razvija, odvrže cvetne liste, nato sadež zraste, pade in postane užiten.

## Objava na spletu

Delovni tok GitHub Actions objavi igro na GitHub Pages ob vsaki spremembi veje `main`. Če GitHub Pages še ni nastavljen, v repozitoriju odpri **Settings → Pages** in pri **Build and deployment → Source** izberi **GitHub Actions**. Po uspešni objavi bo igra na naslovu `https://jimi003.github.io/evo-platformer/`.

Spletna stran in datoteke, vključene v objavo, bodo javno dostopne. Repozitorij lahko ostane zaseben, če to omogoča GitHubov paket; pri paketu GitHub Free mora biti repozitorij za Pages javen. Če GitHub zahteva javni repozitorij, ga ne spreminjaj brez premisleka, saj bi bila javna tudi izvorna koda.
