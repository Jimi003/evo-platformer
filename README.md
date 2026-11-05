# Evo Platformer

3D platformska igra o bitju, ki se bori, zbira evolucijske izboljšave in razvija svojo obliko.

## Zagon lokalno

Repozitorij odpri v VS Code in zaženi lokalni spletni strežnik v mapi projekta:

```sh
python3 -m http.server 8123
```

Igro odpri na `http://localhost:8123`.

## Razvoj in zdravje

Ob običajnem zaključku stopnje najprej izbereš nišo, nato pa eno od trenutno odklenjenih prilagoditev znotraj nje. Prve tri prilagoditve zgradijo temelje organizma: vsaka ponudi do tri različne, združljive in še neizbrane niše, tako da se zgodnja izbira niše ne more ponoviti. Nezdružljivi pari, kot sta voda–ogenj in voda–zrak, se ne ponudijo. Po tretji izbiri so druge niše zaklenjene. Ogenj, strup in prilagoditve z medsebojnimi izključitvami se odklenejo šele pri tretji prilagoditvi. Niše in ponudbo prilagoditev lahko ločeno ter brez omejitve ponovno premešaš z gumbom **ZAMENJAJ NIŠE** oziroma **ZAMENJAJ PONUDBO** ali tipko **R**. Tudi šefovske in skrite prilagoditve ostanejo združljive z izbranimi nišami.

V premoru odpri 3D-razvojno drevo: osrednje vozlišče se povezuje z vozlišči niš, iz katerih se odcepijo njihove prilagoditve. Niše so v različnih prostorskih smereh, barve označujejo niše, oblike vozlišč pa razvojno smer. Drevo obračaš z vlečenjem miške in približuješ z miškinim koleščkom. Nekatere napredne prilagoditve zahtevajo več prej izbranih lastnosti; pogoje in zaklenjene smeri vidiš ob pomiku kazalca nad vozlišče.

Med izbiro izboljšave so prikazane trenutne statistike stvora. Lik obračaš z vlečenjem miške; levi klik napade, desni pa izvede odklenjeni sunek. Začetno bitje je brez nog, podolgovat črvast prednik z glavo na sprednjem koncu telesa. Ob razvoju gibanja se črvasto telo izraziteje skrajša in okrepi v trup oziroma hrbtenico. Prve napadalne izbire razvijejo čeljusti ali ugriz, ne krempljev; kremplji se odklenejo šele kot poznejša veja. Noge se najprej pripnejo ob strani telesa, nato jih prilagoditev **Podtrebušni koraki** premakne pod trup; **Pokončna drža** je ločena poznejša prilagoditev. Oklep na hrbtu razvije vidno kupolasto školjko. Veččlenonožec z oklepom zraste v bitje z osmimi pari stranskih nog; **Krona iz bodic** razvije pet radialnih krakov, medtem ko kombinacija klešč in dvignjenega žela oblikuje škorpijonasto silhueto. Mehkužčev plašč in školjka dajeta polžasto osnovo, strupeni izstrelek pa jo lahko spremeni v stožčastega polža z izstreljivim zobom. Rastlinska simbioza se lahko razvije v mahov plašč ali veliko hrbtno cvetnico; zrak postopoma dodaja perje, voda pa mehkužčasto obliko. Močnejša krila odklenejo dodaten skok. Če stopnjo zaključiš z največ petino zdravja, se v naslednji stopnji pojavi drevo: sadež dozori, pade na tla in ob dotiku povrne petino največjega zdravja (zaokroženo navzdol, najmanj 1).

Kamnite luske zmanjšajo prejeto škodo, jadralni napad okrepi napade med drsenjem, škrge in krvni vonj pa odpirajo dodatne poti preživetja in plenjenja. Epidemija je redkejša in šibkejša: za 3 sekunde uporabi 60-odstotni odmerek strupa, nato se polni 24 sekund. Med sunkom prejmeš 30 % manj škode; zvijanje v klobčič za kratek čas zmanjša škodo za 65 %, a upočasni gibanje.

V nekaterih stopnjah se pojavi skriti brlog, povezan z eno od tvojih razvitih niš. Poišči kamniti vhod, se mu približaj in pritisni **F**; ob zaključku stopnje dobiš do tri ponudbe starodavnih, edinstvenih prilagoditev in izbereš eno. Ognjeni dih pošlje plamene v 15-stopinjskem stožcu do 500 pikslov daleč; delci začnejo padati šele po začetnem ravnem letu. Ognjeni vrtinec ustvari vrtinčast napad pred likom za pet sekund. Aktivne sposobnosti so na tipkah **E/Q/R/V**. Šefi se izmenjujejo med Tiranom, Koreninsko matriarhinjo in Nevihtnim zmajem. Sovražniki na vsaki dve stopnji pridobijo zdravje, škodo in vidne razvojne podrobnosti; po vsakem poraženem šefu se dodatno okrepijo za 20 %. Izzivna težavnost ohranja svoj dodatni 20-odstotni izziv.

## Dnevno-nočni cikel

V devetminutnem ciklu dan in noč trajata po štiri minute, mrak in zora pa po 30 sekund. Sonce in luna potujeta čez nebo; lunine mene se ponovijo na vsakih osem dnevno-nočnih ciklov. Oblaki mehčajo dnevno svetlobo, noč brez mesečine pa je posebej temna. Spreminjajo se nebo, osvetlitev, zvezde in kresničke, ambient pa podnevi poudari ptičje petje, ponoči pa čričke. Cikla se med premorom ustavita in shranita z igro; ne spreminjata sovražnikov, škode ali nagrad.

Okolje se izbira glede na izbrane niše: več vode poveča možnost mokrega nivoja z reko in slapom, rastlinske, ognjene, zračne in strupene smeri pa pogosteje vodijo v sorodne biome. Glavne krošnje in police so podprte z drevesnimi debli ali povezane s skalnimi stenami glede na prevladujočo nišo; na mokrih nivojih so brzice in manjši slapovi zgolj vizualni ter ne spreminjajo varnih površin. Ptice letijo samo podnevi. Talne skale so pogreznjene v tla, tla pa se tudi vizualno nadaljujejo prek robov igralnega območja. Ob zaključku stopnje z največ petino zdravja se v naslednjem nivoju pojavi cvetoče drevo. Cvet se približno minuto razvija, odvrže cvetne liste, nato sadež zraste, pade in postane užiten.

Ob novi različici se izbriše shranjeni potek igre; osebni rekord ostane ohranjen.

## Objava na spletu

Delovni tok GitHub Actions objavi igro na GitHub Pages ob vsaki spremembi veje `main`. Če GitHub Pages še ni nastavljen, v repozitoriju odpri **Settings → Pages** in pri **Build and deployment → Source** izberi **GitHub Actions**. Po uspešni objavi bo igra na naslovu `https://jimi003.github.io/evo-platformer/`.

Spletna stran in datoteke, vključene v objavo, bodo javno dostopne. Repozitorij lahko ostane zaseben, če to omogoča GitHubov paket; pri paketu GitHub Free mora biti repozitorij za Pages javen. Če GitHub zahteva javni repozitorij, ga ne spreminjaj brez premisleka, saj bi bila javna tudi izvorna koda.
