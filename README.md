# Evo Platformer

3D platformska igra o bitju, ki se bori, zbira evolucijske izboljšave in razvija svojo obliko.

## Zagon lokalno

Repozitorij odpri v VS Code in zaženi lokalni spletni strežnik v mapi projekta:

```sh
python3 -m http.server 8123
```

Igro odpri na `http://localhost:8123`.

## Razvoj in zdravje

Prve tri običajne izbire zgradijo temelj organizma: ponudbe najprej skušajo pokazati tri različne, združljive niše; če jih ni dovolj, ponudijo čim bolj raznolike smeri. Po tretji izbiri so druge niše zaklenjene; nezdružljivi pari, kot sta voda–ogenj in voda–zrak, se ne ponudijo. Tudi šefovske in skrite prilagoditve ostanejo združljive z izbranimi nišami.

V premoru odpri 3D-razvojno drevo: niše so v različnih prostorskih smereh, barve označujejo niše, oblike vozlišč pa razvojno smer. Drevo obračaš z vlečenjem miške in približuješ z miškinim koleščkom. Nekatere napredne prilagoditve zahtevajo več prej izbranih lastnosti; pogoje in zaklenjene smeri vidiš ob pomiku kazalca nad vozlišče.

Med izbiro izboljšave so prikazane trenutne statistike stvora. Lik obračaš z vlečenjem miške; levi klik napade, desni pa izvede odklenjeni sunek. Vsaka prva korenska izbira nove niše doda telesu svoj prepoznaven tip debla: členonožca, mehkužca, strunarja, iglokožca ali enega od črvov (kolobarnik, ploščati oziroma valjasti črv); prva izbira določi osnovno obliko, naslednje pa dodajo značilne plošče, členke, okončine in druge telesne poteze. Oklepljeni, težki in bodičasti stvori imajo vsaj štiri noge, posebna veja jih lahko razvije šest; zračno perje se postopno širi po telesu, glavi, repu in krilih. Rastlinska simbioza se lahko razvije v mahov plašč ali veliko hrbtno cvetnico. Klešče imajo razcepljene prijemalne konice, strupeno želo pa se dvigne kot škorpijonov rep. Močnejša krila odklenejo dodaten skok; osnovna zračna izbira najprej doda perje. Če stopnjo zaključiš z največ petino zdravja, se v naslednji stopnji pojavi drevo: sadež dozori, pade na tla in ob dotiku povrne petino največjega zdravja (zaokroženo navzdol, najmanj 1).

Kamnite luske zmanjšajo prejeto škodo, jadralni napad okrepi napade med drsenjem, škrge in krvni vonj pa odpirajo dodatne poti preživetja in plenjenja. Epidemija je redkejša in šibkejša: za 3 sekunde uporabi 60-odstotni odmerek strupa, nato se polni 24 sekund. Med sunkom prejmeš 30 % manj škode; zvijanje v klobčič za kratek čas zmanjša škodo za 65 %, a upočasni gibanje.

V nekaterih stopnjah se pojavi skriti brlog, povezan z eno od tvojih razvitih niš. Poišči kamniti vhod, se mu približaj in pritisni **F**; ob zaključku stopnje dobiš do tri ponudbe starodavnih, edinstvenih prilagoditev in izbereš eno. Šefi se izmenjujejo med Tiranom, Koreninsko matriarhinjo in Nevihtnim zmajem. Sovražniki na vsaki dve stopnji pridobijo zdravje, škodo in vidne razvojne podrobnosti; po vsakem poraženem šefu se dodatno okrepijo za 20 %. Izzivna težavnost ohranja svoj dodatni 20-odstotni izziv.

## Dnevno-nočni cikel

V devetminutnem ciklu dan in noč trajata po štiri minute, mrak in zora pa po 30 sekund. Sonce in luna potujeta čez nebo; lunine mene se ponovijo na vsakih osem dnevno-nočnih ciklov. Oblaki mehčajo dnevno svetlobo, noč brez mesečine pa je posebej temna. Spreminjajo se nebo, osvetlitev, zvezde in kresničke, ambient pa podnevi poudari ptičje petje, ponoči pa čričke. Cikla se med premorom ustavita in shranita z igro; ne spreminjata sovražnikov, škode ali nagrad.

Okolje se izbira glede na izbrane niše: več vode poveča možnost mokrega nivoja z reko in slapom, rastlinske, ognjene, zračne in strupene smeri pa pogosteje vodijo v sorodne biome. Platforme so krošnje, grmiči ali gorske police, talne skale pa so pogreznjene v tla. Tla se tudi vizualno nadaljujejo prek robov igralnega območja. Ob zaključku stopnje z največ petino zdravja se v naslednjem nivoju pojavi cvetoče drevo. Cvet se približno minuto razvija, odvrže cvetne liste, nato sadež zraste, pade in postane užiten.

Ob novi različici se izbriše shranjeni potek igre; osebni rekord ostane ohranjen.

## Objava na spletu

Delovni tok GitHub Actions objavi igro na GitHub Pages ob vsaki spremembi vej `main` ali `prototype`. Če GitHub Pages še ni nastavljen, v repozitoriju odpri **Settings → Pages** in pri **Build and deployment → Source** izberi **GitHub Actions**. Po uspešni objavi bo igra na naslovu `https://jimi003.github.io/evo-platformer/`.

Spletna stran in datoteke, vključene v objavo, bodo javno dostopne. Repozitorij lahko ostane zaseben, če to omogoča GitHubov paket; pri paketu GitHub Free mora biti repozitorij za Pages javen. Če GitHub zahteva javni repozitorij, ga ne spreminjaj brez premisleka, saj bi bila javna tudi izvorna koda.
