-- Dati di prova. Marche e prodotti sono inventati.
-- Ogni prodotto e ogni categoria ha un'illustrazione su Cloudinary (vedi seed_image qui sotto)

-- Le righe qui sotto usano numeri semplici per collegarsi tra loro: seed_id li trasforma
-- in UUID sempre uguali, così i carrelli salvati nel browser restano validi rilanciando il seed.
-- Gli slug di prodotti e marche li genera il database a partire dal nome (vedi set_slug in schema.sql).
CREATE FUNCTION pg_temp.seed_id(kind text, n integer) RETURNS uuid
  LANGUAGE sql IMMUTABLE AS $$ SELECT md5(kind || ':' || n)::uuid $$;

-- Le illustrazioni sono PNG su Cloudinary, caricati con `npm run upload-images` nella cartella sonora/seed:
-- ogni immagine ha come nome lo slug del prodotto o della categoria.
CREATE FUNCTION pg_temp.seed_image(folder text, slug text) RETURNS text
  LANGUAGE sql IMMUTABLE AS $$ SELECT 'https://res.cloudinary.com/bw6lt8wj/image/upload/sonora/seed/' || folder || '/' || slug || '.png' $$;

INSERT INTO categories (id, name, slug, parent_id)
SELECT pg_temp.seed_id('category', id), name, slug, pg_temp.seed_id('category', parent_id)
FROM (VALUES
  (1,  'Chitarre',             'chitarre',             NULL),
  (2,  'Bassi',                'bassi',                NULL),
  (3,  'Batterie',             'batterie',             NULL),
  (4,  'Tastiere',             'tastiere',             NULL),
  (5,  'Audio e registrazione','audio-registrazione',  NULL),
  (6,  'Accessori',            'accessori',            NULL),
  (7,  'Chitarre elettriche',  'chitarre-elettriche',  1),
  (8,  'Chitarre acustiche',   'chitarre-acustiche',   1),
  (9,  'Chitarre classiche',   'chitarre-classiche',   1),
  (10, 'Bassi elettrici',      'bassi-elettrici',      2),
  (11, 'Batterie acustiche',   'batterie-acustiche',   3),
  (12, 'Batterie elettroniche','batterie-elettroniche',3),
  (13, 'Pianoforti digitali',  'pianoforti-digitali',  4),
  (14, 'Sintetizzatori',       'sintetizzatori',       4),
  (15, 'Interfacce audio',     'interfacce-audio',     5),
  (16, 'Microfoni',            'microfoni',            5),
  (17, 'Cuffie',               'cuffie',               5),
  (18, 'Corde',                'corde',                6),
  (19, 'Cavi',                 'cavi',                 6)
) AS v(id, name, slug, parent_id);

INSERT INTO categories (id, name, slug, description, sort_order, parent_id)
SELECT pg_temp.seed_id('category', id), name, slug, description, sort_order, pg_temp.seed_id('category', parent_id)
FROM (VALUES
  (20, 'Bassi acustici',            'bassi-acustici',         'Il calore del legno, con preamplificatore per il palco.',       2, 2),
  (21, 'Piatti',                    'piatti',                 'Crash, ride e hi-hat in bronzo e ottone.',                      3, 3),
  (22, 'Percussioni',               'percussioni',            'Cajon e bonghi per ritmi acustici.',                            4, 3),
  (23, 'Monitor da studio',         'monitor-studio',         'Casse attive per ascoltare e mixare con precisione.',           4, 5),
  (24, 'Amplificatori',             'amplificatori',          'Combo per chitarra e basso, da casa e da palco.',               7, NULL),
  (25, 'Amplificatori per chitarra','amplificatori-chitarra', 'Dai piccoli combo a transistor ai valvolari.',                  1, 24),
  (26, 'Amplificatori per basso',   'amplificatori-basso',    'Potenza e controllo delle frequenze basse.',                    2, 24),
  (27, 'Pedali effetti',            'pedali-effetti',         'Overdrive, delay e altri effetti per il tuo suono.',            3, 6),
  (28, 'Custodie e borse',          'custodie',               'Per trasportare e proteggere i tuoi strumenti.',                4, 6)
) AS v(id, name, slug, description, sort_order, parent_id);

-- Seconda espansione: quattro nuove sottocategorie
INSERT INTO categories (id, name, slug, description, sort_order, parent_id)
SELECT pg_temp.seed_id('category', id), name, slug, description, sort_order, pg_temp.seed_id('category', parent_id)
FROM (VALUES
  (29, 'Ukulele',          'ukulele',         'Soprano, concerto e tenore: piccoli, leggeri e facili da iniziare.', 4, 1),
  (30, 'Controller MIDI',  'controller-midi', 'Tastiere e pad per suonare gli strumenti virtuali del computer.',    3, 4),
  (31, 'Mixer',            'mixer',           'Analogici e digitali, per le prove, il palco e lo streaming.',       5, 5),
  (32, 'Supporti e stand', 'supporti-stand',  'Stand per chitarre e tastiere, aste per microfono e leggii.',        5, 6)
) AS v(id, name, slug, description, sort_order, parent_id);

-- Dettagli categorie: descrizione e ordine di visualizzazione
UPDATE categories c SET description = v.description, sort_order = v.sort_order
FROM (VALUES
  ('chitarre',              1, 'Elettriche, acustiche e classiche, per chi inizia e per chi suona da anni.'),
  ('bassi',                 2, 'Bassi per tenere il ritmo su ogni genere.'),
  ('batterie',              3, 'Kit acustici ed elettronici, per il palco e per la pratica a casa.'),
  ('tastiere',              4, 'Pianoforti digitali e sintetizzatori.'),
  ('audio-registrazione',   5, 'Interfacce, microfoni e cuffie per registrare e ascoltare.'),
  ('accessori',             6, 'Corde, cavi e tutto ciò che serve ogni giorno.'),
  ('chitarre-elettriche',   1, 'Dal blues al metal: single coil, humbucker e semi-hollow.'),
  ('chitarre-acustiche',    2, 'Dreadnought e modelli da viaggio con corde in acciaio.'),
  ('chitarre-classiche',    3, 'Corde in nylon, anche in formato ridotto per i più piccoli.'),
  ('bassi-elettrici',       1, 'Modelli a 4 corde con elettronica attiva o passiva.'),
  ('batterie-acustiche',    1, 'Set completi per le prove e per il palco.'),
  ('batterie-elettroniche', 1, 'Pelli mesh e suoni campionati, ideali per suonare in cuffia.'),
  ('pianoforti-digitali',   1, 'Strumenti da casa e portatili, fino a 88 tasti pesati.'),
  ('sintetizzatori',        2, 'Per creare e modellare i tuoi suoni.'),
  ('interfacce-audio',      1, 'Collega strumenti e microfoni al computer.'),
  ('microfoni',             2, 'A condensatore per lo studio e dinamici per il palco.'),
  ('cuffie',                3, 'Per il monitoraggio in studio e l''ascolto quotidiano.'),
  ('corde',                 1, 'Mute per chitarra elettrica e classica.'),
  ('cavi',                  2, 'Cavi schermati per collegare i tuoi strumenti.')
) AS v(slug, sort_order, description)
WHERE c.slug = v.slug;

INSERT INTO brands (id, name)
SELECT pg_temp.seed_id('brand', id), name
FROM (VALUES
  (1, 'Nordwood'),
  (2, 'Aurora Instruments'),
  (3, 'Kestrel Drums'),
  (4, 'Vesuvio'),
  (5, 'Pulse Audio'),
  (6, 'Stradivolt'),
  (7, 'Altavia'),
  (8, 'Orfeo Amplification')
) AS v(id, name);

INSERT INTO brands (id, name)
SELECT pg_temp.seed_id('brand', id), name
FROM (VALUES
  (9,  'Girasole'),
  (10, 'Fermata')
) AS v(id, name);

INSERT INTO products (id, sku, name, description, price, stock, category_id, brand_id)
SELECT pg_temp.seed_id('product', id), sku, name, description, price, stock, pg_temp.seed_id('category', category_id), pg_temp.seed_id('brand', brand_id)
FROM (VALUES
  (1, 'SON-0001',  'Nordwood ST-1 Sunburst',     'Chitarra elettrica in stile classico con tre pickup single coil e manico in acero. Il suono è brillante e articolato, perfetto per blues, pop e funk, e il selettore a cinque posizioni offre molte sfumature diverse. Una scelta versatile sia per chi inizia sia per chi cerca una seconda chitarra affidabile.', 349.00, 12, 7,  1),
  (2, 'SON-0002',  'Stradivolt Raven HH',        'Elettrica con due humbucker ad alto output, pensata per rock e metal. I 24 tasti e il ponte tremolo a bloccaggio permettono assoli veloci e uso intenso della leva senza perdere l''accordatura. Ha un suono compatto e aggressivo anche con molto guadagno.',               529.00,  5, 7,  6),
  (3, 'SON-0003',  'Aurora Jazzbox 335',         'Chitarra semi-hollow dal suono caldo e rotondo, ideale per jazz, fusion e blues. La camera interna aggiunge risonanza e profondità, mentre il blocco centrale limita i fischi a volume alto. Con i due humbucker passa da accordi morbidi a soli pieni e cantati.',                            749.00,  3, 7,  2),
  (4, 'SON-0004',  'Nordwood D-20 Natural',      'Acustica dreadnought con top in abete massello, che con il tempo matura e migliora il suono. Ha bassi profondi e volume generoso, adatti all''accompagnamento con plettro e allo strumming. Un classico solido per suonare a casa, con gli amici o alle prime esibizioni.',                                     289.00, 18, 8,  1),
  (5, 'SON-0005',  'Aurora Folk Mini',           'Acustica da viaggio con corpo ridotto, leggera e comoda anche per chi ha mani piccole. Il suono è sorprendentemente pieno per le sue dimensioni, e si porta facilmente in vacanza o alle prove. Una buona prima chitarra per chi vuole iniziare senza ingombri.',                            159.00, 25, 8,  2),
  (6, 'SON-0006',  'Vesuvio Classica C-44',      'Chitarra classica con top in cedro e corde in nylon, dal suono caldo e morbido. Il manico largo facilita la tecnica classica e il fingerpicking, ed è ideale per studiare repertorio classico, bossa nova e canzone d''autore. Ottimo rapporto tra qualità e prezzo per chi segue un corso di chitarra.',                            219.00, 10, 9,  4),
  (7, 'SON-0007',  'Vesuvio Studio 1/2',         'Chitarra classica in formato 1/2, pensata per bambini e principianti dai 5 agli 8 anni circa. Le dimensioni ridotte e le corde in nylon morbide rendono più semplice premere le note senza fatica. Robusta e leggera, è perfetta per le prime lezioni.',                              89.00, 30, 9,  4),
  (8, 'SON-0008',  'Stradivolt Thunder 4',       'Basso elettrico a 4 corde con pickup attivi, dal suono moderno, definito e potente. L''elettronica attiva permette di modellare bassi e alti direttamente dallo strumento, e i 24 tasti danno spazio anche alle parti più melodiche. Adatto a rock, funk e pop contemporaneo.',                   459.00,  7, 10, 6),
  (9, 'SON-0009',  'Nordwood PB Vintage',        'Basso a 4 corde dal suono rotondo e classico, con elettronica passiva semplice e diretta. È il timbro che si sente in decenni di dischi rock, soul e pop, e si inserisce bene in qualsiasi band. Un modello senza fronzoli, apprezzato da chi cerca un suono tradizionale.',                                         399.00,  0, 10, 1),
  (10, 'SON-0010', 'Kestrel Fusion 5 pezzi',     'Batteria acustica completa a cinque pezzi, con piatti e hardware già inclusi. Contiene tutto il necessario per iniziare a suonare subito, senza acquisti aggiuntivi. Il suono è equilibrato e adatto alle prove in sala, alle lezioni e ai primi concerti.',                                   689.00,  4, 11, 3),
  (11, 'SON-0011', 'Kestrel Practice E-Kit',     'Batteria elettronica compatta con pelli in mesh, che rispondono in modo naturale e fanno pochissimo rumore. Con 200 suoni e l''uscita cuffie è ideale per esercitarsi in casa a qualsiasi ora senza disturbare i vicini. Occupa poco spazio e si monta in pochi minuti.',        499.00,  9, 12, 3),
  (12, 'SON-0012', 'Kestrel Pro E-Kit 9',        'Batteria elettronica avanzata con 600 suoni e pad in mesh sensibili alla dinamica. Riproduce con precisione le sfumature del tocco, dai colpi leggeri agli accenti più forti, ed è adatta sia allo studio sia al palco. Una soluzione completa per batteristi che vogliono un kit elettronico di livello superiore.',             1290.00,  2, 12, 3),
  (13, 'SON-0013', 'Aurora DP-88',               'Pianoforte digitale con 88 tasti pesati e mobile in legno, pensato per stare in salotto come un pianoforte vero. La meccanica pesata e la polifonia a 192 note permettono di suonare anche brani complessi con il pedale. Ideale per chi studia pianoforte e cerca un''alternativa silenziosa con l''uscita cuffie.',                                     899.00,  6, 13, 2),
  (14, 'SON-0014', 'Aurora Portable 61',         'Tastiera portatile a 61 tasti con accompagnamenti automatici e centinaia di suoni. Funziona a rete o a batterie, quindi si può usare ovunque, ed è un ottimo strumento per avvicinarsi alla musica. Adatta a bambini, principianti e a chi vuole divertirsi suonando.',                         179.00, 20, 13, 2),
  (15, 'SON-0015', 'Pulse Wave Synth 37',        'Sintetizzatore analogico a 37 tasti con quattro oscillatori, per suoni grassi e caldi. I comandi sono tutti sul pannello, così è facile capire come si costruisce un suono girando le manopole. Perfetto per bassi profondi, lead incisivi e pad elettronici.',                                   649.00,  4, 14, 5),
  (16, 'SON-0016', 'Pulse Duo USB',              'Interfaccia audio USB-C con due ingressi e due uscite, alla risoluzione di 24 bit / 192 kHz. Permette di registrare voce e chitarra insieme sul computer con un audio pulito e senza ritardi percepibili. Compatta e alimentata via USB, è il punto di partenza ideale per un piccolo home studio.',                    139.00, 22, 15, 5),
  (17, 'SON-0017', 'Pulse Studio Condenser C1',  'Microfono a condensatore a diaframma largo con diagramma polare cardioide, per voce e strumenti acustici. Cattura dettagli e sfumature con un suono chiaro e presente, ideale per registrazioni in home studio e podcast. Richiede l''alimentazione phantom, disponibile su quasi tutte le interfacce audio.',                    119.00, 15, 16, 5),
  (18, 'SON-0018', 'Pulse Stage D58',            'Microfono dinamico robusto, pensato per l''uso dal vivo su voce e strumenti. Il diagramma cardioide riduce i rientri dagli altri strumenti sul palco, e resiste bene a urti e uso intenso. Uno strumento di lavoro affidabile per band, karaoke e prove in sala.',                                         69.00, 40, 16, 5),
  (19, 'SON-0019', 'Pulse Monitor H50',          'Cuffie chiuse da studio con risposta in frequenza lineare, che restituiscono il suono senza abbellimenti. Isolano bene dall''esterno, quindi sono adatte sia alla registrazione sia al mix. Il connettore da 3,5 mm con adattatore da 6,3 mm le rende compatibili con computer, interfacce e strumenti.',                              99.00, 28, 17, 5),
  (20, 'SON-0020', 'Stradivolt Corde 10-46',     'Muta di corde per chitarra elettrica in acciaio nichelato, scalatura 10-46. È la scalatura più diffusa: un buon equilibrio tra facilità nei bending e corpo del suono. Adatta a quasi tutti i generi, dal pop al rock.',                                8.90, 150, 18, 6),
  (21, 'SON-0021', 'Vesuvio Corde Nylon Normal', 'Muta di corde in nylon per chitarra classica a tensione normale. Offre un suono caldo e una buona proiezione, con una sensazione morbida sotto le dita. Adatta allo studio quotidiano e a chi vuole rinnovare il suono della propria chitarra.',                        9.50, 90, 18, 4),
  (22, 'SON-0022', 'Pulse Cavo Jack 3 m',        'Cavo jack-jack da 6,3 mm schermato, lunghezza 3 metri, per collegare chitarra, basso o tastiera all''amplificatore. La schermatura riduce ronzii e disturbi, mentre i connettori robusti resistono all''uso quotidiano. La lunghezza giusta per suonare in casa o in sala prove.',                                  14.90, 75, 19, 5)
) AS v(id, sku, name, description, price, stock, category_id, brand_id);

INSERT INTO products (id, sku, name, description, price, stock, category_id, brand_id)
SELECT pg_temp.seed_id('product', id), sku, name, description, price, stock, pg_temp.seed_id('category', category_id), pg_temp.seed_id('brand', brand_id)
FROM (VALUES
  (23, 'SON-0023', 'Nordwood Prairie T2',        'Elettrica dal corpo piatto con due single coil, dal suono brillante, diretto e pungente. È la chitarra classica di country e rock''n''roll, ma funziona benissimo anche nell''indie e nel funk. Semplice da regolare e molto comoda da suonare.', 419.00, 8, 7, 1),
  (24, 'SON-0024', 'Stradivolt Viper 7',         'Elettrica a sette corde con manico sottile e due humbucker attivi, pensata per il metal moderno. La corda in più estende la gamma verso il basso per riff pesanti e accordature basse. I 24 tasti e l''elettronica attiva garantiscono un suono preciso anche con distorsioni molto spinte.',     689.00, 4, 7, 6),
  (25, 'SON-0025', 'Aurora Aria Cherry',         'Elettrica in mogano con manico incollato e due humbucker dal suono pieno e corposo. Il mogano dona calore e un sustain lungo, ideale per rock classico, blues e hard rock. Una chitarra di carattere, con finitura ciliegia e una sensazione da strumento di fascia alta.',               899.00, 2, 7, 2),
  (26, 'SON-0026', 'Nordwood Junior 3/4',        'Chitarra elettrica in scala 3/4, leggera e pensata per i più giovani. Le dimensioni ridotte e il manico sottile rendono più facile suonare le prime note e i primi accordi. Un modo semplice per iniziare con la chitarra elettrica senza strumenti troppo grandi.',                            199.00, 14, 7, 1),
  (27, 'SON-0027', 'Nordwood Parlor 12',         'Acustica parlor dal corpo compatto, con top in abete e suono definito e bilanciato. Le note escono chiare e separate, una caratteristica preziosa per il fingerpicking e il blues acustico. Comoda da suonare seduti, è perfetta per chi passa molte ore con lo strumento in mano.',     339.00, 9, 8, 1),
  (28, 'SON-0028', 'Aurora Auditorium Cutaway',  'Acustica auditorium con spalla mancante, che permette di raggiungere facilmente i tasti più alti. Il preamplificatore integrato consente di collegarla direttamente a un impianto o a un amplificatore. Pensata per chi suona dal vivo e cerca un suono acustico naturale anche amplificato.',                 589.00, 6, 8, 2),
  (29, 'SON-0029', 'Nordwood D-12 Dodici Corde', 'Dreadnought a dodici corde dal suono ampio, brillante e ricco di armonici. Le corde accoppiate creano un effetto quasi corale, ideale per accompagnare voce e canzoni folk e rock. Uno strumento particolare che aggiunge colore a qualsiasi arrangiamento.',                                 449.00, 3, 8, 1),
  (30, 'SON-0030', 'Vesuvio Maestro C-90',       'Chitarra classica da concerto con top in abete massello e fasce in noce. Il suono è potente, ricco e definito, con una buona separazione tra le voci anche nei passaggi complessi. Pensata per studenti avanzati di conservatorio e chitarristi che si esibiscono.',                         749.00, 2, 9, 4),
  (31, 'SON-0031', 'Vesuvio Studio 3/4',         'Chitarra classica in formato 3/4, adatta a ragazzi tra gli 8 e i 12 anni circa. Ha le stesse caratteristiche di una chitarra da studio, ma in dimensioni più comode per mani e braccia più piccole. Una buona scelta per le lezioni a scuola o al conservatorio.',                                                     99.00, 22, 9, 4),
  (32, 'SON-0032', 'Vesuvio Flamenca F-20',      'Chitarra flamenca in cipresso, leggera e dalla risposta rapida e percussiva. Il suono brillante e secco è quello tipico del flamenco, adatto ai rasgueados e alle tecniche ritmiche. Ha l''action bassa, che rende veloci anche i passaggi più impegnativi.',                       459.00, 5, 9, 4),
  (33, 'SON-0033', 'Stradivolt Thunder 5',       'Basso elettrico a cinque corde con pickup attivi e manico passante. La corda grave in più amplia l''estensione verso il basso, mentre il manico passante garantisce sustain lungo e accesso comodo ai tasti alti. Ideale per metal, gospel e musica moderna.',                     579.00, 5, 10, 6),
  (34, 'SON-0034', 'Nordwood Smooth Fretless',   'Basso elettrico senza tasti dal suono caldo, morbido e vocale. Le note scivolano l''una nell''altra creando il tipico effetto cantato, molto amato nel jazz e nella fusion. Richiede un po'' di pratica sull''intonazione, ma ripaga con un suono unico.',                                   529.00, 2, 10, 1),
  (35, 'SON-0035', 'Aurora Acoustic Bass 4',     'Basso acustico a 4 corde con preamplificatore e accordatore integrato. Il corpo cavo dà un suono naturale e legnoso, perfetto per sessioni acustiche e unplugged. Si può collegare a un amplificatore quando serve più volume.',                            379.00, 4, 20, 2),
  (36, 'SON-0036', 'Kestrel Rock 5 pezzi',       'Batteria acustica a cinque pezzi con fusti in betulla, dal suono potente e incisivo. La betulla dà attacco e proiezione, ideali per il rock e per i generi più energici. I piatti non sono inclusi, così puoi scegliere quelli più adatti al tuo stile.',               899.00, 3, 11, 3),
  (37, 'SON-0037', 'Kestrel Junior Kit',         'Batteria a tre pezzi pensata per i bambini, con sgabello e piatti inclusi. Le dimensioni ridotte la rendono comoda per i più piccoli, che possono iniziare a suonare subito. Un primo strumento divertente e completo per scoprire il ritmo.',                               249.00, 7, 11, 3),
  (38, 'SON-0038', 'Kestrel Compact E-Kit',      'Batteria elettronica richiudibile con pad in gomma e 120 suoni, pensata per spazi ridotti. Si chiude e si ripone in un armadio, ed è perfetta per studiare il ritmo in cuffia. Una soluzione economica per iniziare senza occupare una stanza intera.',          329.00, 0, 12, 3),
  (39, 'SON-0039', 'Kestrel Crash 16 Bronze',    'Crash da 16 pollici in bronzo B20, con attacco rapido e decadimento breve. Il suono esplode subito e si spegne velocemente, ideale per accenti e chiusure di frase. Adatto a rock, pop e generi in cui serve un crash pronto e brillante.',                  179.00, 11, 21, 3),
  (40, 'SON-0040', 'Kestrel Ride 20 Bronze',     'Ride da 20 pollici in bronzo B20, con un suono definito e controllato. Ogni colpo sulla superficie resta chiaro anche a tempi veloci, mentre la campana è ben distinguibile. Un piatto versatile per jazz, rock e ogni genere che richiede precisione.',                               239.00, 6, 21, 3),
  (41, 'SON-0041', 'Kestrel Hi-Hat 14 Brass',    'Coppia di hi-hat da 14 pollici in ottone, pensati per chi inizia. Il suono è pulito e definito, sia chiusi sia aperti, e l''ottone li rende accessibili come prezzo. Ideali per completare una prima batteria o un kit da studio.',                         89.00, 18, 21, 3),
  (42, 'SON-0042', 'Kestrel Cajon Studio',       'Cajon in betulla con cordiera regolabile, per decidere quanto suono vibrato aggiungere ai colpi. Offre bassi profondi al centro e colpi secchi sui bordi, come una piccola batteria acustica. Perfetto per serate unplugged, busking e accompagnamento acustico.',                                               129.00, 13, 22, 3),
  (43, 'SON-0043', 'Kestrel Bongo Wood',         'Coppia di bonghi in legno con pelli naturali, dal suono caldo e tradizionale. Sono adatti alla musica latina, alla world music e all''accompagnamento acustico. Leggeri e facili da trasportare, aggiungono subito colore ritmico a qualsiasi brano.',                                            99.00, 9, 22, 3),
  (44, 'SON-0044', 'Aurora Home 88 Cabinet',     'Pianoforte digitale da casa con mobile, tre pedali e 88 tasti pesati. La polifonia a 256 note gestisce anche passaggi molto ricchi con il pedale di risonanza, e i tre pedali riproducono quelli di un pianoforte acustico. Adatto allo studio serio del pianoforte, anche in vista del conservatorio.',                                   1190.00, 3, 13, 2),
  (45, 'SON-0045', 'Aurora Stage 73',            'Pianoforte digitale da palco a 73 tasti pesati, leggero e robusto. Le dimensioni contenute lo rendono facile da trasportare, senza rinunciare alla sensazione dei tasti pesati. Pensato per i tastieristi che suonano dal vivo con band e progetti acustici.',                             799.00, 5, 13, 2),
  (46, 'SON-0046', 'Pulse Deep Bass 25',         'Sintetizzatore monofonico a 25 tasti, pensato per linee di basso profonde e incisive. Compatto e semplice da usare, si integra facilmente in un piccolo studio o su un palco. Ideale per musica elettronica, techno e pop sintetico.',                                249.00, 8, 14, 5),
  (47, 'SON-0047', 'Pulse Poly 61',              'Sintetizzatore polifonico a 61 tasti con sequencer integrato. Permette di suonare accordi e pad ricchi e di programmare sequenze direttamente dallo strumento, senza bisogno del computer. Uno strumento completo per produttori e tastieristi che vogliono creare suoni propri.',                          1090.00, 2, 14, 5),
  (48, 'SON-0048', 'Pulse Solo USB',             'Interfaccia audio a un ingresso, compatta e alimentata via USB-C, alla risoluzione di 24 bit / 96 kHz. È la soluzione più semplice per registrare una voce o una chitarra sul computer con qualità professionale. Perfetta per podcast, streaming e prime registrazioni.',                          89.00, 17, 15, 5),
  (49, 'SON-0049', 'Pulse Quad Pro',             'Interfaccia audio a quattro ingressi con preamplificatori a basso rumore, alla risoluzione di 24 bit / 192 kHz. Permette di registrare contemporaneamente più strumenti, ad esempio voce, chitarra e due microfoni. Un passo avanti per chi vuole registrare piccole band o produzioni più complesse.',               299.00, 6, 15, 5),
  (50, 'SON-0050', 'Pulse Drum Mic Set',         'Set completo di sette microfoni per batteria con valigetta, per riprendere cassa, rullante, tom e piatti. Contiene tutto il necessario per microfonare un kit dal vivo o in studio. Una soluzione pratica per band e sale prove.',                                      349.00, 3, 16, 5),
  (51, 'SON-0051', 'Pulse Podcast USB',          'Microfono dinamico con uscita USB, pensato per voce, podcast e streaming. Si collega direttamente al computer senza interfaccia, e il diagramma dinamico riduce i rumori dell''ambiente. Ideale per chi vuole registrare la voce in modo semplice e con buona qualità.',                                              109.00, 21, 16, 5),
  (52, 'SON-0052', 'Pulse Monitor H80',          'Cuffie chiuse da studio con padiglioni in velluto, comode anche per sessioni lunghe. Offrono un buon isolamento e un suono dettagliato, adatto a registrazione e ascolto critico. Il velluto rende più piacevole indossarle per ore.',                                      159.00, 12, 17, 5),
  (53, 'SON-0053', 'Pulse Open H70',             'Cuffie aperte pensate per il mix e gli ascolti prolungati. Il design aperto restituisce un''immagine sonora ampia e naturale, simile a quella delle casse. Non isolano dall''esterno, quindi sono ideali in studio ma non per registrare o usarle in pubblico.',                                      199.00, 7, 17, 5),
  (54, 'SON-0054', 'Pulse Reference M5',         'Monitor attivo da 5 pollici, venduto singolarmente, con amplificazione integrata. Restituisce il suono in modo fedele, per prendere decisioni corrette durante il mix. Adatto a home studio e stanze di dimensioni medio-piccole; per l''ascolto stereo ne servono due.',                                     149.00, 14, 23, 5),
  (55, 'SON-0055', 'Pulse Reference M8',         'Monitor attivo da 8 pollici con risposta estesa sulle frequenze basse. È adatto alla musica elettronica e ai generi in cui il basso ha un ruolo centrale. Pensato per stanze più grandi e per chi vuole un ascolto ricco e dettagliato.',                            279.00, 6, 23, 5),
  (56, 'SON-0056', 'Stradivolt Blaze 15',        'Combo a transistor da 15 watt con distorsione integrata, ideale per suonare in casa. Ha un canale pulito e uno distorto, e l''uscita cuffie permette di esercitarsi in silenzio. Il compagno perfetto per una prima chitarra elettrica.',               129.00, 16, 25, 6),
  (57, 'SON-0057', 'Stradivolt Inferno 50 Tube', 'Combo valvolare da 50 watt a due canali, con il suono caldo e dinamico tipico delle valvole. Il canale pulito è cristallino, mentre quello saturo risponde al tocco e al volume della chitarra. Abbastanza potente per prove e concerti con la batteria.',                                                749.00, 3, 25, 6),
  (58, 'SON-0058', 'Stradivolt Low 100',         'Combo per basso da 100 watt con equalizzatore a quattro bande. Ha la potenza giusta per le prove in sala e per i piccoli concerti, e l''equalizzatore permette di adattare il suono a ogni ambiente. Solido e semplice da usare.',                          339.00, 5, 26, 6),
  (59, 'SON-0059', 'Stradivolt Overdrive Red',   'Pedale overdrive analogico dal carattere caldo e naturale. Aggiunge spinta e saturazione al suono della chitarra, simile a un amplificatore valvolare portato al limite. Ottimo da solo per blues e rock, o per spingere un ampli già distorto.',                                          79.00, 19, 27, 6),
  (60, 'SON-0060', 'Stradivolt Echo Deep',       'Pedale delay digitale con tap tempo e ripetizioni modulate. Il tap tempo permette di sincronizzare le ripetizioni con il tempo del brano, mentre la modulazione aggiunge profondità. Utile per soli, arpeggi atmosferici e paesaggi sonori.',                             129.00, 10, 27, 6),
  (61, 'SON-0061', 'Stradivolt Corde Basso 45-105', 'Muta di corde per basso a 4 corde, scalatura 45-105. È la scalatura più comune per il basso elettrico, con un buon equilibrio tra suonabilità e profondità. Adatta a quasi tutti i generi.',                                  24.90, 60, 18, 6),
  (62, 'SON-0062', 'Nordwood Corde Acustiche 12-54', 'Muta di corde per chitarra acustica in bronzo fosforoso, scalatura 12-54. Il bronzo fosforoso dona un suono caldo e brillante e mantiene a lungo la sua qualità. La scalatura media è ideale per accompagnamento e fingerpicking.',            11.50, 85, 18, 1),
  (63, 'SON-0063', 'Pulse Cavo XLR 5 m',         'Cavo microfonico XLR bilanciato, lunghezza 5 metri. Il collegamento bilanciato riduce rumori e interferenze anche su distanze lunghe. Indispensabile per collegare microfoni a interfacce audio, mixer e impianti.',                                      19.90, 55, 19, 5),
  (64, 'SON-0064', 'Pulse Cavo Patch 15 cm',     'Cavetto jack da 15 cm per collegare tra loro i pedali effetti sulla pedaliera. La lunghezza corta mantiene ordinata la pedaliera, e i connettori robusti resistono all''uso dal vivo. Meglio averne qualcuno di scorta.',                                             5.90, 120, 19, 5),
  (65, 'SON-0065', 'Vesuvio Borsa Classica',     'Borsa imbottita per chitarra classica con tracolla, leggera e pratica. L''imbottitura protegge lo strumento da urti e graffi durante gli spostamenti quotidiani. Perfetta per andare a lezione o alle prove.',                                      39.00, 26, 28, 4),
  (66, 'SON-0066', 'Nordwood Custodia Rigida',   'Custodia rigida sagomata per chitarra elettrica, con interno imbottito. Protegge lo strumento anche nei viaggi e nei trasporti più impegnativi, come furgoni e aerei. Ha uno scomparto interno per cavi, corde e piccoli accessori.',                                        119.00, 8, 28, 1),
  (67, 'SON-0067', 'Nordwood Prairie T2 Limited','Edizione limitata della Prairie T2 con finitura speciale e due single coil. Fuori produzione.',                                                     549.00, 1, 7, 1)
) AS v(id, sku, name, description, price, stock, category_id, brand_id);
-- Espansione: ogni sottocategoria ha almeno 4 prodotti
INSERT INTO products (id, sku, name, description, price, stock, category_id, brand_id)
SELECT pg_temp.seed_id('product', id), sku, name, description, price, stock, pg_temp.seed_id('category', category_id), pg_temp.seed_id('brand', brand_id)
FROM (VALUES
  (68, 'SON-0068', 'Aurora Acoustic Bass 5',     'Basso acustico a cinque corde con top in abete e preamplificatore integrato. La quinta corda estende la gamma verso il basso, mentre il corpo acustico dà un suono naturale e legnoso. Ideale per arrangiamenti acustici che richiedono note più profonde.',                         489.00, 2, 20, 2),
  (69, 'SON-0069', 'Nordwood Folk Bass Mini',    'Basso acustico in scala corta, comodo e leggero da suonare. Le distanze ridotte tra i tasti lo rendono accessibile anche a chi viene dalla chitarra o ha mani piccole. Perfetto per suonare in casa e per le serate acustiche.',                                           299.00, 6, 20, 1),
  (70, 'SON-0070', 'Vesuvio Basso Acustico Fretless', 'Basso acustico senza tasti dal suono morbido, rotondo e vicino a quello del contrabbasso. È un''ottima scelta per jazz acustico e musica d''atmosfera, in uno strumento più comodo e facile da trasportare. Richiede orecchio per l''intonazione, ma il risultato è molto espressivo.',                 459.00, 0, 20, 4),
  (71, 'SON-0071', 'Kestrel Jazz 4 pezzi',       'Batteria acustica a quattro pezzi con cassa da 18 pollici, pensata per jazz e locali piccoli. Le dimensioni ridotte danno un suono controllato e musicale, che non copre gli altri strumenti. I piatti non sono inclusi, così puoi abbinarla a quelli che preferisci.',    749.00, 2, 11, 3),
  (72, 'SON-0072', 'Kestrel Studio E-Kit 7',     'Batteria elettronica con pelli in mesh, 400 suoni e registrazione via USB. Si collega direttamente al computer per registrare le proprie parti o suonare con software di batteria. Una via di mezzo ideale tra i kit da studio e quelli professionali.',                   899.00, 4, 12, 3),
  (73, 'SON-0073', 'Kestrel Splash 10 Bronze',   'Splash da 10 pollici in bronzo B20, con un suono breve, brillante e immediato. Ideale per accenti rapidi e piccole sottolineature durante il groove. Aggiunge varietà a qualsiasi set di piatti.',                                     99.00, 9, 21, 3),
  (74, 'SON-0074', 'Altavia Djembe 12',          'Djembe da 12 pollici in mogano, con pelle di capra e tiranti in corda. Ha bassi profondi al centro e colpi secchi e taglienti sui bordi, tipici della tradizione africana. Perfetto per percussioni acustiche, drum circle e world music.',                                   119.00, 7, 22, 7),
  (75, 'SON-0075', 'Altavia Shaker Duo',         'Coppia di shaker in legno, dal suono morbido e definito. Aggiungono movimento ritmico a brani acustici, registrazioni e serate tra amici. Piccoli, leggeri e facili da usare per tutti.',                                    14.90, 48, 22, 7),
  (76, 'SON-0076', 'Pulse Pocket Synth',         'Sintetizzatore portatile a batterie con altoparlante integrato e tasti a sfioramento. Si porta ovunque e permette di creare suoni e melodie anche lontano dallo studio. Divertente per sperimentare e utile per fissare un''idea al volo.',                           129.00, 15, 14, 5),
  (77, 'SON-0077', 'Pulse Octo Rack',            'Interfaccia audio a otto ingressi in formato rack da 1U, alla risoluzione di 24 bit / 192 kHz. Permette di registrare un''intera band dal vivo, batteria compresa, con una sola unità. Pensata per sale prove, piccoli studi e registrazioni di concerti.',              649.00, 2, 15, 5),
  (78, 'SON-0078', 'Pulse Wireless H30',         'Cuffie wireless chiuse con connessione Bluetooth e fino a 30 ore di autonomia. Sono comode per l''ascolto quotidiano e gli spostamenti, ma per registrare o suonare sono preferibili le cuffie con il cavo, che non hanno ritardi. Una buona scelta per musica, podcast e videochiamate.', 129.00, 19, 17, 5),
  (79, 'SON-0079', 'Pulse Reference M3',         'Coppia di monitor attivi da 3 pollici, pensati per scrivanie piccole e home studio essenziali. Restituiscono un suono più fedele delle normali casse da computer, utile per produrre e ascoltare con attenzione. Compatti, si posizionano facilmente ai lati dello schermo.',                              129.00, 11, 23, 5),
  (80, 'SON-0080', 'Pulse Sub S10',              'Subwoofer attivo da 10 pollici, da abbinare ai monitor Reference. Riproduce le frequenze più basse che i monitor piccoli non riescono a rendere, completando il quadro sonoro. Utile per la musica elettronica e per il mix delle basse frequenze.',                          349.00, 3, 23, 5),
  (81, 'SON-0081', 'Orfeo Brezza 5 Tube',        'Combo valvolare da 5 watt con cono da 8 pollici, pensato per suonare in casa. Le valvole danno un suono caldo e saturo anche a volume basso, cosa difficile con amplificatori più potenti. Perfetto per esercitarsi e registrare con il vero suono delle valvole.', 389.00, 4, 25, 8),
  (82, 'SON-0082', 'Orfeo Palco 2x12',           'Combo valvolare da 100 watt con due coni da 12 pollici, pensato per il palco. Ha una riserva di potenza enorme e un suono pieno, che riempie anche i locali più grandi. Destinato a chitarristi che suonano spesso dal vivo.',            1490.00, 1, 25, 8),
  (83, 'SON-0083', 'Orfeo Basso 30',             'Combo per basso da 30 watt con uscita cuffie, ideale per studiare a casa. Ha un suono pulito e profondo, sufficiente anche per piccole prove acustiche. Con l''uscita cuffie puoi esercitarti in silenzio.',                        159.00, 12, 26, 8),
  (84, 'SON-0084', 'Stradivolt Low 300',         'Combo per basso da 300 watt con cono da 15 pollici e uscita DI. Offre bassi profondi e potenza sufficiente per concerti e palchi medio-grandi. L''uscita DI permette di collegarlo direttamente al mixer del fonico.',                           649.00, 2, 26, 6),
  (85, 'SON-0085', 'Orfeo Basso Mini 10',        'Amplificatore per basso da 10 watt, alimentato a batterie o a rete. Si porta facilmente ovunque, per esercitarsi in viaggio, nei camerini o all''aperto. Piccolo ma utile per avere sempre un suono a disposizione.',                       89.00, 0, 26, 8),
  (86, 'SON-0086', 'Altavia Cavo Jack Angolato 6 m', 'Cavo jack lungo 6 metri, con un connettore dritto e uno ad angolo retto. Il connettore angolato è comodo per le chitarre con l''ingresso frontale e riduce lo sforzo sul cavo. La lunghezza permette di muoversi liberamente sul palco.',                       22.90, 40, 19, 7),
  (87, 'SON-0087', 'Orfeo Riverbero Hall',       'Pedale riverbero digitale con tre ambienti: stanza, sala e molla. Aggiunge profondità e spazio al suono, dal leggero alone di una stanza alla coda lunga di una sala da concerto. Il riverbero a molla ricrea il suono vintage di molti amplificatori classici.',                                   99.00, 14, 27, 8),
  (88, 'SON-0088', 'Stradivolt Fuzz Storm',      'Pedale fuzz analogico al germanio, dal suono grezzo, saturo e pieno di carattere. È il suono distorto degli anni Sessanta e del rock psichedelico, molto sensibile al tocco e al volume della chitarra. Ideale per chi cerca un timbro vintage e aggressivo.',                                         89.00, 6, 27, 6),
  (89, 'SON-0089', 'Orfeo Accordatore Pedale',   'Accordatore cromatico a pedale con display luminoso, leggibile anche sui palchi più bui. Il true bypass lascia passare il suono senza alterarlo quando è spento. Indispensabile su qualsiasi pedaliera.',                         49.00, 33, 27, 8),
  (90, 'SON-0090', 'Altavia Gig Bag Basso',      'Borsa imbottita per basso elettrico con tasca per gli accessori. Protegge lo strumento negli spostamenti quotidiani e ha spazio per cavi, corde e accordatore. Si porta comodamente a spalla come uno zaino.',                           49.00, 21, 28, 7),
  -- Il nome lungo serve a verificare che le card del catalogo non si deformino
  (91, 'SON-0091', 'Altavia Borsa Bacchette Professionale con Scomparti Multipli e Tracolla Imbottita',
                                                 'Borsa per bacchette e piccoli accessori da batteria, con scomparti multipli e tracolla imbottita. Tiene in ordine bacchette, spazzole, chiave di accordatura e ricambi. Si porta a spalla o si aggancia al timpano della batteria per avere tutto a portata di mano.', 34.90, 30, 28, 7)
) AS v(id, sku, name, description, price, stock, category_id, brand_id);

-- Seconda espansione: le quattro nuove sottocategorie (ukulele, controller MIDI, mixer, supporti)
-- e altri due prodotti in ognuna di quelle esistenti, che arrivano così ad almeno 6
INSERT INTO products (id, sku, name, description, price, stock, category_id, brand_id)
SELECT pg_temp.seed_id('product', id), sku, name, description, price, stock, pg_temp.seed_id('category', category_id), pg_temp.seed_id('brand', brand_id)
FROM (VALUES
  (92,  'SON-0092', 'Aurora Baritono B6',           'Chitarra elettrica baritona a sei corde, con scala lunga e accordatura più grave di una quarta. Il suono è profondo e ampio, a metà strada tra chitarra e basso, perfetto per colonne sonore, surf e metal moderno. I due humbucker mantengono le note definite anche sulle corde più basse.', 629.00, 3, 7, 2),
  (93,  'SON-0093', 'Stradivolt Comet Offset',      'Elettrica dal corpo asimmetrico con due single coil a bobina larga, dal suono corposo e un po'' ruvido. È molto amata nell''indie e nel rock alternativo, e resta comoda sia in piedi sia da seduti. Il ponte con leva permette vibrati morbidi e leggeri.', 479.00, 6, 7, 6),
  (94,  'SON-0094', 'Nordwood Jumbo J-30',          'Acustica jumbo dal corpo grande, con top in abete massello e fondo in acero. Ha un volume imponente e bassi pieni, ideali per accompagnare la voce con accordi aperti. Una chitarra da palco che si fa sentire anche senza amplificazione.', 519.00, 4, 8, 1),
  (95,  'SON-0095', 'Aurora Concert Mahogany',      'Acustica formato concert interamente in mogano, dal suono caldo, asciutto e ricco di medi. Il corpo più piccolo di una dreadnought la rende comoda e molto equilibrata nel fingerpicking. Rende bene anche in registrazione, dove non servono bassi eccessivi.', 369.00, 7, 8, 2),
  (96,  'SON-0096', 'Vesuvio Elettrificata CE-60',  'Chitarra classica con spalla mancante e preamplificatore con accordatore integrato. Si collega direttamente all''impianto mantenendo il suono morbido delle corde in nylon. Pensata per chi suona bossa nova, pop e musica latina dal vivo.', 329.00, 8, 9, 4),
  (97,  'SON-0097', 'Vesuvio Studio 4/4',           'Chitarra classica da studio in formato intero, per ragazzi dai 12 anni in su e per adulti. Ha il top in abete e un manico regolare, comodo per imparare le prime posizioni. Completa la serie Studio insieme ai formati 1/2 e 3/4.', 129.00, 27, 9, 4),
  (98,  'SON-0098', 'Nordwood JB Deluxe',           'Basso a 4 corde con due pickup single coil e manico sottile, veloce e comodo. Miscelando i due pickup si passa da un suono rotondo a uno nasale e graffiante, ottimo per funk e slap. Un tuttofare che trova posto in qualsiasi genere.', 469.00, 6, 10, 1),
  (99,  'SON-0099', 'Stradivolt Shorty 30',         'Basso elettrico a scala corta da 30 pollici, leggero e maneggevole. Le distanze ridotte tra i tasti aiutano chi inizia, chi ha mani piccole e i chitarristi che passano al basso. Il suono è caldo e pieno, con un carattere un po'' vintage.', 289.00, 10, 10, 6),
  (100, 'SON-0100', 'Girasole Ukulele Basso',       'Ukulele basso con corde in gomma dal suono sorprendentemente profondo, simile a un contrabbasso. È lungo poco più di un ukulele baritono e si porta ovunque, in uno zaino. Il preamplificatore integrato permette di collegarlo a un amplificatore o all''impianto.', 219.00, 5, 20, 9),
  (101, 'SON-0101', 'Nordwood Jumbo Bass Cutaway',  'Basso acustico dal corpo jumbo con spalla mancante e preamplificatore. La cassa grande dà più volume degli altri bassi acustici, utile quando si suona senza amplificazione. La spalla mancante facilita l''accesso ai tasti più alti.', 429.00, 3, 20, 1),
  (102, 'SON-0102', 'Kestrel Maple Studio 4 pezzi', 'Batteria acustica a quattro pezzi con fusti in acero, dal suono caldo, rotondo e ricco di armonici. È pensata per lo studio di registrazione e per i batteristi più esigenti. Vengono forniti solo i fusti: piatti e hardware si scelgono a parte.', 1190.00, 1, 11, 3),
  (103, 'SON-0103', 'Kestrel Cocktail Compact',     'Batteria compatta a quattro pezzi con cassa da 16 pollici, pensata per palchi piccoli e appartamenti. Si smonta in fretta e sta nel bagagliaio di un''utilitaria, e nonostante le dimensioni ha un suono pieno, adatto a pop, jazz e serate acustiche. I piatti non sono inclusi.', 459.00, 5, 11, 3),
  (104, 'SON-0104', 'Kestrel Pad Multi 8',          'Multipad elettronico con otto superfici sensibili alla dinamica e 300 suoni di percussioni. Si suona con le bacchette, da solo o accanto a una batteria acustica per aggiungere suoni elettronici. Si possono caricare anche campioni propri tramite USB.', 279.00, 8, 12, 3),
  (105, 'SON-0105', 'Kestrel Hybrid E-Kit 11',      'Batteria elettronica con fusti in legno a grandezza naturale, pelli in mesh e 900 suoni. Dal palco sembra una batteria acustica, ma offre tutti i vantaggi dell''elettronica: volume controllato e suoni sempre pronti. Il modello di punta della gamma elettronica Kestrel.', 1890.00, 1, 12, 3),
  (106, 'SON-0106', 'Kestrel China 18 Bronze',      'China da 18 pollici in bronzo B20, dal suono tagliente, esotico e aggressivo. Serve per accenti forti e passaggi che devono farsi notare, soprattutto in rock e metal. Si monta di solito capovolto, per colpirlo più comodamente sul bordo.', 189.00, 4, 21, 3),
  (107, 'SON-0107', 'Kestrel Set Piatti Brass',     'Set di piatti in ottone composto da hi-hat da 14 pollici, crash da 16 e ride da 20, con borsa inclusa. Contiene tutti i piatti necessari per completare una batteria venduta senza. Una soluzione economica per iniziare, da migliorare un pezzo alla volta.', 199.00, 10, 21, 3),
  (108, 'SON-0108', 'Altavia Tamburello 10',        'Tamburello da 10 pollici con cornice in legno, pelle naturale e doppia fila di sonagli. Si suona con la mano o scuotendolo, per accompagnare canzoni, musica popolare e cori. Uno strumento semplice e immediato, adatto anche ai bambini.', 24.90, 32, 22, 7),
  (109, 'SON-0109', 'Altavia Congas Duo',           'Coppia di congas da 10 e 11 pollici in legno, con supporto regolabile incluso. Hanno un suono caldo e profondo, con toni aperti ben distinti dagli slap. Sono la base ritmica di salsa, musica latina e di molte formazioni acustiche.', 349.00, 2, 22, 7),
  (110, 'SON-0110', 'Aurora Slim 88',               'Pianoforte digitale portatile con 88 tasti pesati e profondità di soli 23 centimetri. Si appoggia su una scrivania o su uno stand e si ripone facilmente quando non serve. Il Bluetooth permette di suonare sopra le basi riprodotte dal telefono.', 549.00, 9, 13, 2),
  (111, 'SON-0111', 'Aurora Mini Coda 88',          'Pianoforte digitale con mobile a mezza coda e finitura nera lucida, per chi vuole anche un bell''oggetto d''arredo. Gli 88 tasti in legno con meccanica a martelletti restituiscono un tocco molto vicino a quello di un acustico. Il sistema a sei altoparlanti riempie la stanza con un suono ampio e avvolgente.', 2490.00, 1, 13, 2),
  (112, 'SON-0112', 'Pulse Drum Machine 16',        'Drum machine analogica con sequencer a 16 passi e otto voci di batteria sintetizzate. Cassa, rullante e charleston si programmano accendendo i tasti, in modo immediato e visivo. Si sincronizza con sintetizzatori e computer tramite MIDI e USB.', 329.00, 6, 14, 5),
  (113, 'SON-0113', 'Pulse Modular Starter',        'Sintetizzatore semi-modulare con 20 punti di connessione e cavetti inclusi. Suona già senza collegare nulla, ma ogni cavo aggiunto apre percorsi nuovi e suoni imprevisti. Il modo più semplice per avvicinarsi al mondo dei sintetizzatori modulari.', 449.00, 0, 14, 5),
  (114, 'SON-0114', 'Pulse Stream Mix',             'Interfaccia audio per streaming con due ingressi e funzione loopback, alla risoluzione di 24 bit / 96 kHz. Il loopback unisce microfono e audio del computer in un unico segnale, pronto per dirette e registrazioni. Ha un tasto mute sul pannello, comodo durante le trasmissioni.', 179.00, 13, 15, 5),
  (115, 'SON-0115', 'Pulse Mobile One',             'Interfaccia audio tascabile per smartphone e tablet, con un ingresso per chitarra o microfono. Si alimenta direttamente dal dispositivo e non ha bisogno di driver. Utile per registrare idee, video e lezioni ovunque ci si trovi.', 69.00, 24, 15, 5),
  (116, 'SON-0116', 'Pulse Ribbon R2',              'Microfono a nastro dal suono morbido e naturale, con diagramma polare a figura di otto. Addolcisce le sorgenti più aspre, come amplificatori per chitarra, fiati e piatti. È uno strumento delicato: va protetto dai colpi d''aria e riposto con cura.', 289.00, 3, 16, 5),
  (117, 'SON-0117', 'Pulse Pencil Pair',            'Coppia di microfoni a condensatore a diaframma piccolo, selezionati per la ripresa stereo. Sono indicati per chitarra acustica, pianoforte, cori e panoramici della batteria. Nella confezione ci sono la barra stereo, le clip e le protezioni antivento.', 199.00, 7, 16, 5),
  (118, 'SON-0118', 'Pulse In-Ear M2',              'Auricolari in-ear a doppio driver per l''ascolto sul palco. Isolano dal rumore esterno e permettono di sentirsi bene a volume più basso, proteggendo l''udito. Il cavo è staccabile e si sostituisce facilmente in caso di usura.', 89.00, 16, 17, 5),
  (119, 'SON-0119', 'Pulse Monitor H20',            'Cuffie chiuse economiche per studiare con strumenti digitali, tastiere e batterie elettroniche. Sono leggere e hanno un cavo lungo tre metri, comodo per muoversi intorno allo strumento. La scelta più semplice per chi cerca un primo paio di cuffie.', 39.00, 45, 17, 5),
  (120, 'SON-0120', 'Pulse Reference M6 Coax',      'Monitor attivo coassiale da 6,5 pollici, con il tweeter montato al centro del woofer. Il suono parte da un unico punto e l''immagine stereo resta precisa anche spostandosi dalla posizione ideale. Venduto singolarmente, è adatto a studi di dimensioni medie.', 329.00, 4, 23, 5),
  (121, 'SON-0121', 'Pulse Desk Controller',        'Controller passivo da scrivania per monitor da studio, con una grande manopola del volume. Permette di abbassare, silenziare o passare da una coppia di casse all''altra senza toccare il computer. Non richiede alimentazione e non colora il suono.', 79.00, 12, 23, 5),
  (122, 'SON-0122', 'Orfeo Acustico 60',            'Amplificatore da 60 watt per chitarra acustica e voce, con due canali indipendenti. Ogni canale ha il proprio equalizzatore e un riverbero, così chitarra e microfono si regolano separatamente. Basta da solo per serate in locali piccoli e per suonare in strada.', 329.00, 5, 25, 8),
  (123, 'SON-0123', 'Stradivolt Blaze 40 Modeling', 'Combo digitale da 40 watt che simula dodici amplificatori diversi, dai puliti cristallini alle distorsioni moderne. Ha effetti integrati, accordatore e collegamento USB per registrare direttamente sul computer. Molti suoni in un solo amplificatore, per chi vuole sperimentare.', 239.00, 9, 25, 6),
  (124, 'SON-0124', 'Orfeo Testata Basso 500',      'Testata per basso da 500 watt in classe D, che pesa meno di tre chili. Ha un equalizzatore a quattro bande, un compressore e l''uscita DI per il mixer. Va collegata a una cassa passiva, come la Orfeo Cassa Basso 4x10.', 449.00, 3, 26, 8),
  (125, 'SON-0125', 'Orfeo Cassa Basso 4x10',       'Cassa passiva per basso con quattro coni da 10 pollici e tromba per gli alti. Regge fino a 600 watt e offre un suono veloce, definito e con molto impatto. Richiede una testata separata.', 399.00, 2, 26, 8),
  (126, 'SON-0126', 'Stradivolt Corde 9-42',        'Muta di corde per chitarra elettrica in acciaio nichelato, scalatura 9-42. Sono più sottili e morbide delle 10-46, quindi facilitano bending e vibrati. Adatte a chi inizia e a chi preferisce un tocco leggero.', 7.90, 140, 18, 6),
  (127, 'SON-0127', 'Girasole Corde Ukulele',       'Muta di corde in fluorocarbonio per ukulele soprano e concerto. Hanno un suono brillante e tengono bene l''accordatura dopo i primi giorni di assestamento. Si montano con l''accordatura standard Sol-Do-Mi-La.', 6.90, 70, 18, 9),
  (128, 'SON-0128', 'Pulse Cavo MIDI 2 m',          'Cavo MIDI a cinque poli lungo 2 metri, per collegare tastiere, sintetizzatori e drum machine. Trasmette note e sincronizzazione tra gli strumenti, non il segnale audio. Indispensabile per gli strumenti senza porta USB.', 9.90, 35, 19, 5),
  (129, 'SON-0129', 'Altavia Cavo Speaker 150 cm',  'Cavo di potenza lungo 150 cm con connettori jack, per collegare una testata alla sua cassa. Non è schermato e ha conduttori di sezione maggiore: non va confuso con un normale cavo per strumenti. Usare il cavo giusto protegge l''amplificatore.', 16.90, 22, 19, 7),
  (130, 'SON-0130', 'Orfeo Chorus Onda',            'Pedale chorus analogico dal suono liquido e avvolgente. Con poca profondità allarga il suono pulito, con molta produce il tipico tremolio degli anni Ottanta. Funziona bene anche con il basso e con le tastiere.', 89.00, 11, 27, 8),
  (131, 'SON-0131', 'Stradivolt Compressor Blue',   'Pedale compressore analogico che uniforma il volume delle note e allunga il sustain. Rende più regolari arpeggi e ritmiche funk, e dà più corpo ai soli sul pulito. Va usato con moderazione: se è troppo spinto aumenta il rumore di fondo.', 69.00, 15, 27, 6),
  (132, 'SON-0132', 'Altavia Borsa Tastiera 61',    'Borsa imbottita per tastiere a 61 tasti, con maniglie e tracolla. Ha una tasca esterna ampia per alimentatore, pedale e spartiti. Protegge lo strumento negli spostamenti tra casa, lezioni e prove.', 44.90, 12, 28, 7),
  (133, 'SON-0133', 'Altavia Custodia Rigida Acustica', 'Custodia rigida per chitarra acustica dreadnought, con interno in peluche e chiusure a scatto. Protegge lo strumento da urti e sbalzi di umidità molto meglio di una borsa morbida. All''interno c''è un vano per plettri, capotasto e corde di ricambio.', 99.00, 6, 28, 7),
  -- Ukulele
  (134, 'SON-0134', 'Girasole Soprano Mogano',      'Ukulele soprano in mogano, il formato più piccolo e tradizionale. Ha il suono allegro e squillante che tutti associano all''ukulele. Con quattro corde e pochi accordi semplici si suonano subito tantissime canzoni.', 59.00, 34, 29, 9),
  (135, 'SON-0135', 'Girasole Concerto Koa',        'Ukulele concerto con top in koa, il legno hawaiano della tradizione. È un po'' più grande del soprano: ha più volume, più sustain e tasti più comodi per le mani adulte. La venatura del koa rende ogni strumento diverso dagli altri.', 129.00, 12, 29, 9),
  (136, 'SON-0136', 'Girasole Tenore Elettrificato','Ukulele tenore con spalla mancante, preamplificatore e accordatore integrato. Il corpo più grande dà un suono pieno e profondo, adatto anche alle parti soliste. Si collega all''impianto per suonare dal vivo.', 189.00, 6, 29, 9),
  (137, 'SON-0137', 'Girasole Soprano Arcobaleno',  'Ukulele soprano dalla finitura colorata, pensato per i bambini. È robusto, leggero e ha corde morbide che non fanno male alle dita. Un primo strumento allegro per avvicinarsi alla musica giocando.', 34.90, 50, 29, 9),
  -- Controller MIDI
  (138, 'SON-0138', 'Pulse Keys 25 Mini',           'Controller MIDI con 25 mini tasti, otto pad e otto manopole assegnabili. Si collega via USB e sta nello zaino insieme al portatile. Ideale per comporre in viaggio e per chi ha poco spazio sulla scrivania.', 79.00, 26, 30, 5),
  (139, 'SON-0139', 'Pulse Keys 49',                'Controller MIDI con 49 tasti di dimensione standard sensibili alla dinamica. Ha le rotelle di pitch e modulazione e i comandi per controllare la registrazione dal software. Quattro ottave bastano per suonare con due mani la maggior parte delle parti.', 149.00, 11, 30, 5),
  (140, 'SON-0140', 'Pulse Pad 16',                 'Controller con 16 pad retroilluminati sensibili alla pressione, per suonare batterie e campioni. I pad cambiano colore per distinguere a colpo d''occhio i suoni assegnati. Molto usato per hip hop, musica elettronica e finger drumming.', 119.00, 9, 30, 5),
  (141, 'SON-0141', 'Aurora Master 88',             'Master keyboard con 88 tasti pesati a martelletti, senza suoni interni. Si collega al computer o a un modulo sonoro e ne controlla gli strumenti con il tocco di un pianoforte. Per pianisti che usano strumenti virtuali in studio o dal vivo.', 599.00, 2, 30, 2),
  -- Supporti e stand
  (142, 'SON-0142', 'Fermata Stand Chitarra A',     'Supporto pieghevole a cavalletto per chitarra elettrica, acustica o classica. Le imbottiture in gomma proteggono la vernice e i piedini non scivolano sul pavimento. Chiuso occupa pochissimo spazio e sta nella tasca di una borsa.', 14.90, 60, 32, 10),
  (143, 'SON-0143', 'Fermata Stand Tastiera X',     'Supporto a X per tastiere e pianoforti digitali, regolabile in cinque altezze. La doppia struttura regge strumenti fino a 50 chili. Si chiude in pochi secondi per il trasporto.', 29.90, 25, 32, 10),
  (144, 'SON-0144', 'Fermata Asta Microfono Giraffa', 'Asta per microfono con braccio a giraffa e base a treppiede. Il braccio regolabile permette di posizionare il microfono davanti alla voce, a un amplificatore o sopra una batteria. La clip per il microfono è inclusa.', 34.90, 30, 32, 10),
  (145, 'SON-0145', 'Fermata Leggio Orchestra',     'Leggio con piano forato in metallo, stabile e regolabile in altezza e inclinazione. Regge senza problemi anche i libri di spartiti più pesanti. È il modello che si trova nelle scuole di musica e nelle orchestre.', 39.00, 18, 32, 10),
  (146, 'SON-0146', 'Fermata Stand Triplo Chitarre','Supporto per tre chitarre o bassi, con appoggi imbottiti. Tiene in ordine gli strumenti in sala prove o sul palco, sempre a portata di mano. Si ripiega per il trasporto.', 44.90, 0, 32, 10),
  -- Mixer
  (147, 'SON-0147', 'Pulse Mix 6',                  'Mixer analogico a sei canali con due ingressi microfonici e alimentazione phantom. Ogni canale ha il proprio equalizzatore a tre bande. Adatto a duo acustici, piccole feste e sale prove.', 119.00, 10, 31, 5),
  (148, 'SON-0148', 'Pulse Mix 12 FX',              'Mixer a dodici canali con effetti integrati e interfaccia USB. Riverberi e delay si aggiungono alle voci senza apparecchi esterni, e l''uscita USB registra il mix sul computer. Pensato per band che gestiscono da sole il proprio suono dal vivo.', 289.00, 5, 31, 5),
  (149, 'SON-0149', 'Pulse Digital Mix 16',         'Mixer digitale a sedici canali, controllabile a distanza da tablet tramite Wi-Fi. Le scene memorizzano tutte le regolazioni e si richiamano con un tocco, concerto dopo concerto. Ogni canale dispone di compressore, equalizzatore parametrico ed effetti.', 899.00, 2, 31, 5),
  (150, 'SON-0150', 'Pulse Mix Pocket 4',           'Mini mixer a quattro canali alimentato a batterie o via USB. Serve per unire più tastiere, lettori o strumenti elettronici in una sola uscita. Piccolo come una mano, sta in qualsiasi borsa.', 59.00, 14, 31, 5)
) AS v(id, sku, name, description, price, stock, category_id, brand_id);

-- Prodotto nascosto: serve a provare che non compaia nel negozio
UPDATE products SET active = false WHERE id = pg_temp.seed_id('product', 67);

-- Date di inserimento diverse, così l'ordinamento "Più recenti" ha un effetto visibile
-- Si parte dal codice articolo più alto: funziona con qualsiasi numero di prodotti
UPDATE products SET created_at = now()
  - ((SELECT MAX(right(sku, 4)::int) FROM products) - right(sku, 4)::int) * interval '1 day';

-- Prodotti in evidenza nella landing page
UPDATE products SET featured = true
WHERE id IN (SELECT pg_temp.seed_id('product', n) FROM unnest(ARRAY[1, 8, 11, 13, 15, 16, 57, 87]) AS n);

INSERT INTO product_specs (product_id, label, value)
SELECT pg_temp.seed_id('product', product_id), label, value
FROM (VALUES
  (1, 'Corde', '6'), (1, 'Pickup', '3 single coil'), (1, 'Tasti', '22'), (1, 'Manico', 'Acero'),
  (2, 'Corde', '6'), (2, 'Pickup', '2 humbucker'),   (2, 'Tasti', '24'), (2, 'Ponte', 'Tremolo a bloccaggio'),
  (3, 'Corde', '6'), (3, 'Corpo', 'Semi-hollow'),    (3, 'Pickup', '2 humbucker'),
  (4, 'Corde', '6'), (4, 'Top', 'Abete massello'),   (4, 'Forma', 'Dreadnought'),
  (6, 'Corde', '6 (nylon)'), (6, 'Top', 'Cedro'),
  (8, 'Corde', '4'), (8, 'Elettronica', 'Attiva'),   (8, 'Tasti', '24'),
  (10, 'Pezzi', '5'), (10, 'Piatti inclusi', 'Sì'),
  (11, 'Pelli', 'Mesh'), (11, 'Suoni', '200'),
  (12, 'Pelli', 'Mesh'), (12, 'Suoni', '600'),
  (13, 'Tasti', '88 pesati'), (13, 'Polifonia', '192 note'),
  (15, 'Tasti', '37'), (15, 'Oscillatori', '4'), (15, 'Tipo', 'Analogico'),
  (16, 'Ingressi', '2'), (16, 'Risoluzione', '24 bit / 192 kHz'), (16, 'Connessione', 'USB-C'),
  (17, 'Tipo', 'Condensatore'), (17, 'Diagramma polare', 'Cardioide'),
  (20, 'Scalatura', '10-46'), (20, 'Materiale', 'Acciaio nichelato')
) AS v(product_id, label, value);

INSERT INTO product_specs (product_id, label, value)
SELECT pg_temp.seed_id('product', product_id), label, value
FROM (VALUES
  (5, 'Corde', '6'), (5, 'Corpo', 'Ridotto da viaggio'),
  (7, 'Corde', '6 (nylon)'), (7, 'Formato', '1/2'),
  (9, 'Corde', '4'), (9, 'Elettronica', 'Passiva'),
  (14, 'Tasti', '61'), (14, 'Alimentazione', 'Rete o batterie'),
  (18, 'Tipo', 'Dinamico'), (18, 'Diagramma polare', 'Cardioide'),
  (19, 'Tipo', 'Chiuse'), (19, 'Connettore', 'Jack 3,5 mm con adattatore 6,3 mm'),
  (21, 'Materiale', 'Nylon'), (21, 'Tensione', 'Normale'),
  (22, 'Lunghezza', '3 m'), (22, 'Connettori', 'Jack 6,3 mm'),
  (23, 'Corde', '6'), (23, 'Pickup', '2 single coil'), (23, 'Tasti', '22'),
  (24, 'Corde', '7'), (24, 'Pickup', '2 humbucker attivi'), (24, 'Tasti', '24'),
  (25, 'Corde', '6'), (25, 'Corpo', 'Mogano'), (25, 'Pickup', '2 humbucker'),
  (26, 'Corde', '6'), (26, 'Formato', '3/4'),
  (27, 'Corde', '6'), (27, 'Forma', 'Parlor'), (27, 'Top', 'Abete'),
  (28, 'Corde', '6'), (28, 'Forma', 'Auditorium con cutaway'), (28, 'Elettronica', 'Preamplificatore integrato'),
  (29, 'Corde', '12'), (29, 'Forma', 'Dreadnought'),
  (30, 'Corde', '6 (nylon)'), (30, 'Top', 'Abete massello'), (30, 'Fasce', 'Noce'),
  (31, 'Corde', '6 (nylon)'), (31, 'Formato', '3/4'),
  (32, 'Corde', '6 (nylon)'), (32, 'Fasce', 'Cipresso'),
  (33, 'Corde', '5'), (33, 'Elettronica', 'Attiva'), (33, 'Manico', 'Passante'),
  (34, 'Corde', '4'), (34, 'Tasti', 'Senza tasti'),
  (35, 'Corde', '4'), (35, 'Elettronica', 'Preamplificatore con accordatore'),
  (36, 'Pezzi', '5'), (36, 'Fusti', 'Betulla'), (36, 'Piatti inclusi', 'No'),
  (37, 'Pezzi', '3'), (37, 'Piatti inclusi', 'Sì'), (37, 'Sgabello', 'Incluso'),
  (38, 'Pelli', 'Gomma'), (38, 'Suoni', '120'), (38, 'Richiudibile', 'Sì'),
  (39, 'Diametro', '16"'), (39, 'Lega', 'Bronzo B20'),
  (40, 'Diametro', '20"'), (40, 'Lega', 'Bronzo B20'),
  (41, 'Diametro', '14"'), (41, 'Lega', 'Ottone'),
  (42, 'Materiale', 'Betulla'), (42, 'Cordiera', 'Regolabile'),
  (43, 'Materiale', 'Legno'), (43, 'Pelli', 'Naturali'),
  (44, 'Tasti', '88 pesati'), (44, 'Pedali', '3'), (44, 'Polifonia', '256 note'),
  (45, 'Tasti', '73 pesati'), (45, 'Polifonia', '128 note'),
  (46, 'Tasti', '25'), (46, 'Tipo', 'Monofonico'),
  (47, 'Tasti', '61'), (47, 'Tipo', 'Polifonico'), (47, 'Sequencer', 'Integrato'),
  (48, 'Ingressi', '1'), (48, 'Risoluzione', '24 bit / 96 kHz'), (48, 'Connessione', 'USB-C'),
  (49, 'Ingressi', '4'), (49, 'Risoluzione', '24 bit / 192 kHz'), (49, 'Connessione', 'USB-C'),
  (50, 'Microfoni', '7'), (50, 'Custodia', 'Valigetta inclusa'),
  (51, 'Tipo', 'Dinamico'), (51, 'Connessione', 'USB'),
  (52, 'Tipo', 'Chiuse'), (52, 'Padiglioni', 'Velluto'),
  (53, 'Tipo', 'Aperte'), (53, 'Connettore', 'Jack 3,5 mm con adattatore 6,3 mm'),
  (54, 'Woofer', '5"'), (54, 'Tipo', 'Attivo'),
  (55, 'Woofer', '8"'), (55, 'Tipo', 'Attivo'),
  (56, 'Potenza', '15 W'), (56, 'Tecnologia', 'Transistor'),
  (57, 'Potenza', '50 W'), (57, 'Tecnologia', 'Valvolare'), (57, 'Canali', '2'),
  (58, 'Potenza', '100 W'), (58, 'Equalizzatore', '4 bande'),
  (59, 'Effetto', 'Overdrive'), (59, 'Circuito', 'Analogico'),
  (60, 'Effetto', 'Delay'), (60, 'Circuito', 'Digitale'), (60, 'Tap tempo', 'Sì'),
  (61, 'Scalatura', '45-105'), (61, 'Corde', '4'),
  (62, 'Scalatura', '12-54'), (62, 'Materiale', 'Bronzo fosforoso'),
  (63, 'Lunghezza', '5 m'), (63, 'Connettori', 'XLR'),
  (64, 'Lunghezza', '15 cm'), (64, 'Connettori', 'Jack 6,3 mm'),
  (65, 'Compatibilità', 'Chitarra classica'), (65, 'Tracolla', 'Inclusa'),
  (66, 'Compatibilità', 'Chitarra elettrica'), (66, 'Tipo', 'Rigida'),
  (67, 'Corde', '6'), (67, 'Pickup', '2 single coil')
) AS v(product_id, label, value);

INSERT INTO product_specs (product_id, label, value)
SELECT pg_temp.seed_id('product', product_id), label, value
FROM (VALUES
  (68, 'Corde', '5'), (68, 'Top', 'Abete'), (68, 'Elettronica', 'Preamplificatore'),
  (69, 'Corde', '4'), (69, 'Scala', 'Corta'),
  (70, 'Corde', '4'), (70, 'Tasti', 'Senza tasti'),
  (71, 'Pezzi', '4'), (71, 'Cassa', '18"'), (71, 'Piatti inclusi', 'No'),
  (72, 'Pelli', 'Mesh'), (72, 'Suoni', '400'), (72, 'Connessione', 'USB'),
  (73, 'Diametro', '10"'), (73, 'Lega', 'Bronzo B20'),
  (74, 'Diametro', '12"'), (74, 'Materiale', 'Mogano'), (74, 'Pelle', 'Capra'),
  (75, 'Materiale', 'Legno'), (75, 'Pezzi', '2'),
  (76, 'Tasti', 'Pad a sfioramento'), (76, 'Alimentazione', 'Batterie'), (76, 'Altoparlante', 'Integrato'),
  (77, 'Ingressi', '8'), (77, 'Risoluzione', '24 bit / 192 kHz'), (77, 'Formato', 'Rack 1U'),
  (78, 'Tipo', 'Chiuse'), (78, 'Connessione', 'Bluetooth'), (78, 'Autonomia', '30 ore'),
  (79, 'Woofer', '3"'), (79, 'Tipo', 'Attivo'), (79, 'Confezione', 'Coppia'),
  (80, 'Woofer', '10"'), (80, 'Tipo', 'Subwoofer attivo'),
  (81, 'Potenza', '5 W'), (81, 'Tecnologia', 'Valvolare'), (81, 'Cono', '8"'),
  (82, 'Potenza', '100 W'), (82, 'Tecnologia', 'Valvolare'), (82, 'Coni', '2 x 12"'),
  (83, 'Potenza', '30 W'), (83, 'Uscita cuffie', 'Sì'),
  (84, 'Potenza', '300 W'), (84, 'Cono', '15"'), (84, 'Uscita DI', 'Sì'),
  (85, 'Potenza', '10 W'), (85, 'Alimentazione', 'Batterie o rete'),
  (86, 'Lunghezza', '6 m'), (86, 'Connettori', 'Jack 6,3 mm dritto / angolato'),
  (87, 'Effetto', 'Riverbero'), (87, 'Circuito', 'Digitale'), (87, 'Ambienti', '3'),
  (88, 'Effetto', 'Fuzz'), (88, 'Circuito', 'Analogico al germanio'),
  (89, 'Tipo', 'Accordatore cromatico'), (89, 'Bypass', 'True bypass'),
  (90, 'Compatibilità', 'Basso elettrico'), (90, 'Tipo', 'Imbottita'),
  (91, 'Compatibilità', 'Bacchette e accessori'), (91, 'Tracolla', 'Inclusa')
) AS v(product_id, label, value);

INSERT INTO product_specs (product_id, label, value)
SELECT pg_temp.seed_id('product', product_id), label, value
FROM (VALUES
  (92, 'Corde', '6'), (92, 'Scala', 'Baritona'), (92, 'Pickup', '2 humbucker'),
  (93, 'Corde', '6'), (93, 'Pickup', '2 single coil a bobina larga'), (93, 'Ponte', 'Con leva'),
  (94, 'Corde', '6'), (94, 'Forma', 'Jumbo'), (94, 'Top', 'Abete massello'),
  (95, 'Corde', '6'), (95, 'Forma', 'Concert'), (95, 'Corpo', 'Mogano'),
  (96, 'Corde', '6 (nylon)'), (96, 'Forma', 'Con cutaway'), (96, 'Elettronica', 'Preamplificatore con accordatore'),
  (97, 'Corde', '6 (nylon)'), (97, 'Formato', '4/4'), (97, 'Top', 'Abete'),
  (98, 'Corde', '4'), (98, 'Pickup', '2 single coil'), (98, 'Elettronica', 'Passiva'),
  (99, 'Corde', '4'), (99, 'Scala', 'Corta (30")'),
  (100, 'Corde', '4 (gomma)'), (100, 'Elettronica', 'Preamplificatore integrato'),
  (101, 'Corde', '4'), (101, 'Forma', 'Jumbo con cutaway'), (101, 'Elettronica', 'Preamplificatore'),
  (102, 'Pezzi', '4'), (102, 'Fusti', 'Acero'), (102, 'Piatti inclusi', 'No'),
  (103, 'Pezzi', '4'), (103, 'Cassa', '16"'), (103, 'Piatti inclusi', 'No'),
  (104, 'Pad', '8'), (104, 'Suoni', '300'), (104, 'Connessione', 'USB'),
  (105, 'Pelli', 'Mesh'), (105, 'Suoni', '900'), (105, 'Fusti', 'Legno'),
  (106, 'Diametro', '18"'), (106, 'Lega', 'Bronzo B20'),
  (107, 'Lega', 'Ottone'), (107, 'Pezzi', 'Hi-hat 14", crash 16", ride 20"'), (107, 'Borsa', 'Inclusa'),
  (108, 'Diametro', '10"'), (108, 'Pelle', 'Naturale'), (108, 'Sonagli', 'Doppia fila'),
  (109, 'Diametri', '10" e 11"'), (109, 'Materiale', 'Legno'), (109, 'Supporto', 'Incluso'),
  (110, 'Tasti', '88 pesati'), (110, 'Connessione', 'Bluetooth'), (110, 'Profondità', '23 cm'),
  (111, 'Tasti', '88 in legno'), (111, 'Mobile', 'Mezza coda'), (111, 'Altoparlanti', '6'),
  (112, 'Tipo', 'Drum machine analogica'), (112, 'Sequencer', '16 passi'), (112, 'Voci', '8'),
  (113, 'Tipo', 'Semi-modulare'), (113, 'Punti di connessione', '20'),
  (114, 'Ingressi', '2'), (114, 'Risoluzione', '24 bit / 96 kHz'), (114, 'Loopback', 'Sì'),
  (115, 'Ingressi', '1'), (115, 'Compatibilità', 'Smartphone e tablet'),
  (116, 'Tipo', 'Nastro'), (116, 'Diagramma polare', 'Figura di otto'),
  (117, 'Tipo', 'Condensatore a diaframma piccolo'), (117, 'Confezione', 'Coppia'),
  (118, 'Tipo', 'In-ear'), (118, 'Driver', '2'), (118, 'Cavo', 'Staccabile'),
  (119, 'Tipo', 'Chiuse'), (119, 'Cavo', '3 m'),
  (120, 'Woofer', '6,5"'), (120, 'Tipo', 'Attivo coassiale'),
  (121, 'Tipo', 'Controller passivo'), (121, 'Alimentazione', 'Non richiesta'),
  (122, 'Potenza', '60 W'), (122, 'Canali', '2'), (122, 'Riverbero', 'Sì'),
  (123, 'Potenza', '40 W'), (123, 'Tecnologia', 'Digitale'), (123, 'Simulazioni', '12'),
  (124, 'Potenza', '500 W'), (124, 'Tecnologia', 'Classe D'), (124, 'Uscita DI', 'Sì'),
  (125, 'Coni', '4 x 10"'), (125, 'Potenza massima', '600 W'), (125, 'Tipo', 'Passiva'),
  (126, 'Scalatura', '9-42'), (126, 'Materiale', 'Acciaio nichelato'),
  (127, 'Materiale', 'Fluorocarbonio'), (127, 'Compatibilità', 'Ukulele soprano e concerto'),
  (128, 'Lunghezza', '2 m'), (128, 'Connettori', 'MIDI a 5 poli'),
  (129, 'Lunghezza', '150 cm'), (129, 'Connettori', 'Jack 6,3 mm'),
  (130, 'Effetto', 'Chorus'), (130, 'Circuito', 'Analogico'),
  (131, 'Effetto', 'Compressore'), (131, 'Circuito', 'Analogico'),
  (132, 'Compatibilità', 'Tastiere a 61 tasti'), (132, 'Tracolla', 'Inclusa'),
  (133, 'Compatibilità', 'Chitarra acustica dreadnought'), (133, 'Tipo', 'Rigida'),
  (134, 'Corde', '4'), (134, 'Formato', 'Soprano'), (134, 'Corpo', 'Mogano'),
  (135, 'Corde', '4'), (135, 'Formato', 'Concerto'), (135, 'Top', 'Koa'),
  (136, 'Corde', '4'), (136, 'Formato', 'Tenore'), (136, 'Elettronica', 'Preamplificatore con accordatore'),
  (137, 'Corde', '4'), (137, 'Formato', 'Soprano'),
  (138, 'Tasti', '25 mini'), (138, 'Pad', '8'), (138, 'Connessione', 'USB'),
  (139, 'Tasti', '49'), (139, 'Connessione', 'USB'),
  (140, 'Pad', '16'), (140, 'Connessione', 'USB'),
  (141, 'Tasti', '88 pesati'), (141, 'Suoni interni', 'No'), (141, 'Connessione', 'USB e MIDI'),
  (142, 'Compatibilità', 'Chitarra elettrica, acustica e classica'), (142, 'Pieghevole', 'Sì'),
  (143, 'Compatibilità', 'Tastiere e pianoforti digitali'), (143, 'Portata', '50 kg'), (143, 'Altezze', '5'),
  (144, 'Base', 'Treppiede'), (144, 'Braccio', 'Giraffa regolabile'),
  (145, 'Materiale', 'Metallo'), (145, 'Regolazione', 'Altezza e inclinazione'),
  (146, 'Posti', '3'), (146, 'Pieghevole', 'Sì'),
  (147, 'Canali', '6'), (147, 'Ingressi microfonici', '2'), (147, 'Tipo', 'Analogico'),
  (148, 'Canali', '12'), (148, 'Effetti', 'Integrati'), (148, 'Connessione', 'USB'),
  (149, 'Canali', '16'), (149, 'Tipo', 'Digitale'), (149, 'Controllo remoto', 'Wi-Fi'),
  (150, 'Canali', '4'), (150, 'Alimentazione', 'Batterie o USB')
) AS v(product_id, label, value);

-- Una copertina per ogni prodotto
INSERT INTO product_images (product_id, url, alt, sort_order)
SELECT id, pg_temp.seed_image('prodotti', slug), 'Illustrazione di ' || name, 0
FROM products;

-- E un'illustrazione per ogni categoria
UPDATE categories SET image_url = pg_temp.seed_image('categorie', slug);
-- Clienti di esempio, autori delle recensioni qui sotto.
-- Non possono accedere: l'hash è quello di una password casuale che non è mai stata salvata da nessuna parte.
INSERT INTO users (id, first_name, last_name, email, password_hash)
SELECT pg_temp.seed_id('user', id), first_name, last_name, email, '$2b$10$k0wsScbrkUlKNc.1MOY81.1tbTD9kNnU4dB0HrOUfhM1sK/BkEuoy'
FROM (VALUES
  (1, 'Giulia',   'Bianchi',  'giulia.bianchi@example.com'),
  (2, 'Marco',    'Ricci',    'marco.ricci@example.com'),
  (3, 'Sara',     'Tedeschi', 'sara.tedeschi@example.com'),
  (4, 'Luca',     'Pellegrini', 'luca.pellegrini@example.com'),
  (5, 'Chiara',   'Esposito', 'chiara.esposito@example.com'),
  (6, 'Davide',   'Fontana',  'davide.fontana@example.com'),
  (7, 'Elena',    'Moretti',  'elena.moretti@example.com'),
  (8, 'Francesco', 'Galli',   'francesco.galli@example.com'),
  (9,  'Alessandro', 'Conti',   'alessandro.conti@example.com'),
  (10, 'Martina',  'Greco',     'martina.greco@example.com'),
  (11, 'Paolo',    'Marchetti', 'paolo.marchetti@example.com'),
  (12, 'Federica', 'Lombardi',  'federica.lombardi@example.com'),
  (13, 'Simone',   'De Luca',   'simone.deluca@example.com'),
  (14, 'Valentina', 'Rinaldi',  'valentina.rinaldi@example.com')
) AS v(id, first_name, last_name, email);

-- Alcuni acquisti già consegnati e pagati alla consegna, uno per ordine: chi recensisce un prodotto che ha comprato ha il badge "Acquisto verificato"
CREATE TEMP TABLE seed_purchases (id integer, user_id integer, product_id integer, days integer, address text, city text, postal_code text, province text);
INSERT INTO seed_purchases VALUES
  (1, 1, 1,  60, 'Via Roma 12',           'Milano',  '20121', 'MI'),
  (2, 2, 8,  55, 'Corso Vittorio Emanuele 40', 'Torino', '10123', 'TO'),
  (3, 3, 13, 50, 'Via dei Mille 8',       'Napoli',  '80121', 'NA'),
  (4, 4, 11, 45, 'Via Indipendenza 21',   'Bologna', '40121', 'BO'),
  (5, 5, 16, 40, 'Via Garibaldi 3',       'Genova',  '16124', 'GE'),
  (6, 6, 57, 38, 'Piazza delle Erbe 5',   'Verona',  '37121', 'VR'),
  (7, 7, 87, 35, 'Via Etnea 102',         'Catania', '95124', 'CT'),
  (8, 2, 15, 30, 'Corso Vittorio Emanuele 40', 'Torino', '10123', 'TO'),
  (9, 8, 4,  28, 'Via Toledo 77',         'Napoli',  '80134', 'NA'),
  (10, 9,  134, 26, 'Via Maqueda 150',      'Palermo', '90133', 'PA'),
  (11, 10, 110, 24, 'Via Sparano 18',       'Bari',    '70121', 'BA'),
  (12, 11, 148, 22, 'Via Mazzini 9',        'Trieste', '34121', 'TS'),
  (13, 12, 138, 19, 'Via dei Calzaiuoli 31', 'Firenze', '50122', 'FI'),
  (14, 13, 98,  18, 'Via del Corso 210',    'Roma',    '00186', 'RM'),
  (15, 14, 122, 16, 'Corso Garibaldi 64',   'Ancona',  '60121', 'AN'),
  (16, 9,  142, 14, 'Via Maqueda 150',      'Palermo', '90133', 'PA'),
  (17, 3,  96,  12, 'Via dei Mille 8',      'Napoli',  '80121', 'NA'),
  (18, 5,  123, 10, 'Via Garibaldi 3',      'Genova',  '16124', 'GE'),
  (19, 12, 140, 9,  'Via dei Calzaiuoli 31', 'Firenze', '50122', 'FI'),
  (20, 10, 135, 6,  'Via Sparano 18',       'Bari',    '70121', 'BA'),
  (21, 1,  119, 5,  'Via Roma 12',          'Milano',  '20121', 'MI');

INSERT INTO orders (id, user_id, total, status, paid_at, customer_name, customer_email, address, city, postal_code, province, created_at)
SELECT pg_temp.seed_id('order', s.id), u.id, p.price, 'delivered', now() - s.days * interval '1 day',
       u.first_name || ' ' || u.last_name, u.email,
       s.address, s.city, s.postal_code, s.province, now() - s.days * interval '1 day'
FROM seed_purchases s
JOIN users u ON u.id = pg_temp.seed_id('user', s.user_id)
JOIN products p ON p.id = pg_temp.seed_id('product', s.product_id);

INSERT INTO order_items (order_id, product_id, quantity, unit_price)
SELECT pg_temp.seed_id('order', s.id), p.id, 1, p.price
FROM seed_purchases s
JOIN products p ON p.id = pg_temp.seed_id('product', s.product_id);

DROP TABLE seed_purchases;

-- Recensioni: soprattutto sui prodotti in evidenza, con voti vari e qualche commento lasciato vuoto
INSERT INTO reviews (product_id, user_id, rating, comment, created_at, updated_at)
SELECT pg_temp.seed_id('product', product_id), pg_temp.seed_id('user', user_id), rating, comment,
       now() - days * interval '1 day', now() - days * interval '1 day'
FROM (VALUES
  -- Nordwood ST-1 Sunburst
  (1, 1, 5, 'Arrivata già regolata e con le corde nuove. Il suono pulito in posizione 4 è proprio quello che cercavo per il funk.', 50),
  (1, 3, 4, 'Ottima per iniziare e anche oltre. Il tremolo scorda un po'' se lo usi tanto, ma per il prezzo non mi lamento.', 33),
  (1, 6, 5, '', 20),
  (1, 8, 4, 'Manico comodo e finitura curata. Ho cambiato solo i pickup del ponte per avere più spinta.', 9),
  -- Stradivolt Thunder 4
  (8, 2, 5, 'Basso solidissimo: bassi pieni e un medio che si sente bene nel mix della band. Leggero per essere un quattro corde.', 44),
  (8, 4, 4, 'Buono, ma la custodia non è inclusa. Il suono invece è da strumento di fascia più alta.', 26),
  (8, 7, 3, 'Suona bene, però un tasto ronzava. Con una regolazione del truss rod si è sistemato.', 12),
  -- Kestrel Practice E-Kit
  (11, 4, 5, 'Perfetta per suonare in appartamento: i vicini non hanno più bussato. I pad sono silenziosi e rispondono bene.', 40),
  (11, 5, 4, 'Montaggio semplice, mezz''ora. Il pedale della cassa è un po'' leggero, lo cambierò.', 22),
  (11, 1, 5, 'Regalo per mio figlio di 12 anni: la usa tutti i giorni con le basi del modulo.', 7),
  -- Aurora DP-88
  (13, 3, 5, 'La tastiera pesata è molto realistica e i suoni di pianoforte sono ricchi. Uso le cuffie la sera e funziona tutto benissimo.', 45),
  (13, 7, 5, 'Dopo anni di acustico avevo paura di perdere il tocco, invece è stato un passaggio naturale.', 30),
  (13, 2, 4, 'Ottimo pianoforte digitale. Gli altoparlanti integrati sono un po'' deboli per una sala grande.', 15),
  (13, 6, 2, 'Il suono è bello, ma a me è arrivato con un tasto più rumoroso degli altri. L''assistenza però mi ha risposto in fretta.', 4),
  -- Pulse Wave Synth 37
  (15, 2, 5, 'Piccolo ma potente: i filtri suonano grassi e il sequencer è immediato. Ci ho fatto già tre pezzi.', 25),
  (15, 8, 4, 'Divertentissimo. Il manuale è scritto un po'' male, ma ci sono tanti video online.', 11),
  -- Pulse Duo USB
  (16, 5, 5, 'Collegata al portatile e riconosciuta subito, senza installare nulla. Preamplificatori puliti e silenziosi.', 35),
  (16, 1, 4, 'Fa esattamente quello che deve. Avrei voluto una manopola del volume cuffie più grande.', 18),
  (16, 4, 5, '', 6),
  -- Stradivolt Inferno 50 Tube
  (57, 6, 5, 'Il crunch del canale due è magnifico, valvolare vero. Pesante da portare in giro, ma ne vale la pena.', 30),
  (57, 3, 4, 'Suono caldissimo. Il riverbero integrato è un po'' scarso, uso un pedale a parte.', 14),
  -- Orfeo Riverbero Hall
  (87, 7, 5, 'Code lunghissime e naturali, sembra di suonare in una chiesa. Il pedale migliore che abbia comprato quest''anno.', 28),
  (87, 5, 5, 'Silenzioso anche con la manopola al massimo. Sta sempre acceso sulla mia pedaliera.', 10),
  (87, 8, 3, 'Bello ma molto simile ad altri riverberi che costano meno.', 3),
  -- Nordwood D-20 Natural
  (4, 8, 5, 'Bassi profondi e volume notevole. Dopo qualche settimana il top in abete si è aperto e suona ancora meglio.', 20),
  (4, 2, 4, 'Ottima acustica, l''action di fabbrica era un po'' alta.', 8),
  -- Nordwood PB Vintage
  (9, 6, 5, 'Il classico suono da Motown, rotondo e caldo. Con le flat wound è perfetto.', 17),
  -- Pulse Studio Condenser C1
  (17, 5, 4, 'Registra la voce in modo chiaro e dettagliato. Serve un ambiente trattato, perché sente anche la stanza.', 21),
  (17, 3, 5, '', 13),
  -- Pulse Monitor H50
  (19, 1, 4, 'Cuffie chiuse comode anche dopo ore. Isolano bene, ottime per registrare.', 16),
  -- Stradivolt Fuzz Storm
  (88, 4, 5, 'Fuzz enorme e sporco, proprio quello che volevo per lo stoner. Le manopole hanno un''escursione utile.', 5),
  (88, 7, 2, 'Troppo estremo per i miei gusti: anche al minimo è molto saturo.', 2),
  -- Girasole Soprano Mogano
  (134, 9, 5, 'Preso per curiosità, non lo mollo più. In una settimana suonavo già quattro canzoni.', 20),
  (134, 2, 4, 'Suono allegro e finiture pulite. Le corde ci mettono qualche giorno a tenere l''accordatura, è normale.', 11),
  (134, 14, 5, '', 4),
  -- Aurora Slim 88
  (110, 10, 5, 'Sta sulla scrivania e la sera lo infilo sotto il letto. I tasti pesati sono migliori di quanto mi aspettassi a questo prezzo.', 18),
  (110, 7, 4, 'Ottimo tocco e Bluetooth comodo per le basi. Il pedale incluso è piccolo e scivola, meglio prenderne uno serio.', 8),
  -- Pulse Mix 12 FX
  (148, 11, 4, 'Lo usiamo in sala prove con la band: canali a sufficienza e riverberi più che dignitosi. I potenziometri sono un po'' vicini tra loro.', 15),
  (148, 6, 5, 'Registro le prove via USB senza altri apparecchi. Per quello che costa fa tantissimo.', 5),
  -- Pulse Keys 25 Mini
  (138, 12, 5, 'Vive nello zaino insieme al portatile. I pad rispondono bene e le manopole si mappano in un attimo.', 14),
  (138, 5, 3, 'Comodo da portare in giro, ma i mini tasti sono davvero mini: per suonare parti di piano serve altro.', 6),
  -- Nordwood JB Deluxe
  (98, 13, 5, 'Manico velocissimo e il pickup al ponte ha quel suono nasale perfetto per il funk. Arrivato con un''ottima regolazione.', 12),
  (98, 2, 4, 'Versatile e ben costruito. Con un solo pickup aperto c''è un leggero ronzio, tipico dei single coil.', 3),
  -- Orfeo Acustico 60
  (122, 14, 5, 'Chitarra e voce in un unico amplificatore: ci faccio le serate nei locali senza portarmi dietro l''impianto.', 10),
  -- Fermata Stand Chitarra A
  (142, 9, 4, 'Semplice e stabile. Lo uso anche per l''ukulele, stringendo un po'' i bracci.', 9),
  (142, 1, 5, '', 2),
  (142, 13, 2, 'Fa il suo lavoro, ma uno dei gommini si è staccato dopo pochi giorni.', 1),
  -- Vesuvio Elettrificata CE-60
  (96, 3, 5, 'Amplificata mantiene il suono caldo del nylon, senza quell''effetto plastica di tante elettrificate. L''accordatore integrato è comodissimo.', 7),
  -- Stradivolt Blaze 40 Modeling
  (123, 5, 4, 'Tantissimi suoni e la registrazione via USB funziona al primo colpo. Il menu richiede un po'' di pazienza.', 6),
  (123, 8, 3, 'I puliti sono belli, le distorsioni più spinte suonano un po'' finte. Per studiare in casa va benissimo.', 2),
  -- Pulse Pad 16
  (140, 12, 4, 'Pad sensibili e colori utili per orientarsi. Avrei gradito un cavo USB più lungo.', 5),
  -- Girasole Concerto Koa
  (135, 10, 5, 'Il legno è bellissimo, dal vivo ancora più che in foto. Rispetto al soprano ha molto più corpo.', 3),
  -- Pulse Monitor H20
  (119, 1, 3, 'Per studiare con la tastiera vanno bene. Il suono è un po'' chiuso, ma a questo prezzo non pretendo di più.', 2),
  (119, 11, 4, 'Leggere e con il cavo lungo: perfette per la batteria elettronica di mia figlia.', 1),
  -- Kestrel Cajon Studio
  (42, 13, 5, 'Basso profondo e cordiera che si regola davvero. Lo porto a tutte le serate acustiche.', 23),
  (42, 10, 4, 'Bel suono e costruzione solida. Consiglio un cuscino: dopo un''ora la seduta si fa sentire.', 9),
  -- Stradivolt Overdrive Red
  (59, 14, 5, 'Sempre acceso davanti al mio valvolare: aggiunge spinta senza cambiare il carattere della chitarra.', 19),
  (59, 6, 4, 'Caldo e dinamico. Con il gain oltre metà diventa un po'' scuro, basta alzare il tono.', 12),
  (59, 11, 1, 'Il mio esemplare aveva l''interruttore difettoso e si spegneva da solo. Ho chiesto il reso.', 3),
  -- Pulse Podcast USB
  (51, 12, 5, 'Collegato e pronto in un minuto. La voce esce piena e il rumore della ventola del computer quasi non si sente.', 16),
  (51, 9, 4, '', 7),
  -- Vesuvio Studio 1/2
  (7, 11, 5, 'Misura giusta per mia figlia di sei anni, che finalmente arriva a tutti i tasti. Tiene bene l''accordatura.', 13),
  -- Aurora Portable 61
  (14, 14, 4, 'Tanti suoni e accompagnamenti divertenti. I tasti sono leggeri, ma per iniziare è perfetta.', 8)
) AS v(product_id, user_id, rating, comment, days);