# Evo Platformer

3D platformska igra o bitju, ki se bori, zbira evolucijske izboljšave in razvija svojo obliko.

## Zagon lokalno

Repozitorij odpri v VS Code in zaženi lokalni spletni strežnik v mapi projekta:

```sh
python3 -m http.server 8123
```

Igro odpri na `http://localhost:8123`.

## Razvoj in zdravje

Izboljšave so razporejene v štiri povezane smeri: telesni načrt, gibanje in življenjski prostor, bojni slog ter preživetje. Barva posamezne izboljšave še vedno označuje njeno nišo. Nekatere napredne prilagoditve zahtevajo kombinacijo več prej izbranih lastnosti; pogoje vidiš v drevesu razvoja. Omejitve so prikazane posebej, zato izbira ene lastnosti ne zapre več samodejno vseh sorodnih vej.

Med izbiro izboljšave so prikazane trenutne statistike stvora. Če stopnjo zaključiš z največ petino zdravja, se v naslednji stopnji pojavi drevo: sadež dozori, pade na tla in ob dotiku povrne petino največjega zdravja (zaokroženo navzdol, najmanj 1).

## Objava na spletu

Delovni tok GitHub Actions objavi igro na GitHub Pages ob vsaki spremembi veje `main`. Če GitHub Pages še ni nastavljen, v repozitoriju odpri **Settings → Pages** in pri **Build and deployment → Source** izberi **GitHub Actions**. Po uspešni objavi bo igra na naslovu `https://jimi003.github.io/evo-platformer/`.

Spletna stran in datoteke, vključene v objavo, bodo javno dostopne. Repozitorij lahko ostane zaseben, če to omogoča GitHubov paket; pri paketu GitHub Free mora biti repozitorij za Pages javen. Če GitHub zahteva javni repozitorij, ga ne spreminjaj brez premisleka, saj bi bila javna tudi izvorna koda.
