// Lista de medicamentos disponibles en farmacias chilenas.
// Formato: 'Nombre genérico (Nombre/s comercial/es más conocido/s en Chile)' cuando corresponda.
// Fuentes de referencia: ISP/ANAMED Chile, vademécum.es (Chile), Cruz Verde, Salcobrand,
// Farmacias Ahumada, Formulario Nacional de Medicamentos Chile, PAHO.
// Usada por el combobox de receta médica en SeccionReceta.
// Última actualización: 2026-03-21.

export const MEDICAMENTOS: string[] = [
  // ── Analgésicos opioides ──────────────────────────────────────────────────
  'Buprenorfina (Temgesic, Transtec)',
  'Codeína',
  'Codeína + Paracetamol (Codalgin)',
  'Fentanilo (Durogesic)',
  'Hidromorfona',
  'Metadona',
  'Morfina',
  'Oxicodona (OxyContin)',
  'Tramadol (Tramal)',
  'Tramadol + Paracetamol (Zaldiar)',

  // ── Analgésicos no opioides ────────────────────────────────────────────────
  'Ketorolaco (Toradol)',
  'Metamizol / Dipirona (Novalgina)',
  'Paracetamol (Panadol, Tapsin)',
  'Paracetamol 1 g (Panadol Forte, Tapsin Forte)',
  'Paracetamol + Clorfenamina + Pseudoefedrina (Antigripal)',

  // ── Antiinflamatorios no esteroidales (AINEs) ────────────────────────────
  'Celecoxib (Celebrex)',
  'Diclofenaco (Voltaren)',
  'Diclofenaco gel tópico (Voltaren Emulgel)',
  'Etoricoxib (Arcoxia)',
  'Ibuprofeno (Advil, Motrin)',
  'Ketoprofeno (Profenid)',
  'Meloxicam (Mobicox, Mobic)',
  'Naproxeno (Naprosyn)',
  'Naproxeno sódico (Flanax)',
  'Nimesulida',
  'Piroxicam (Feldene)',
  'Tenoxicam (Tilcotil)',

  // ── Antibióticos — Penicilinas ────────────────────────────────────────────
  'Amoxicilina',
  'Amoxicilina + Ácido clavulánico (Augmentin, Amoxidal Duo)',
  'Ampicilina',
  'Ampicilina + Sulbactam',
  'Cloxacilina',
  'Penicilina benzatínica (Benzetacil)',
  'Penicilina V (Penoral)',
  'Piperacilina + Tazobactam (Tazocin)',

  // ── Antibióticos — Cefalosporinas ─────────────────────────────────────────
  'Cefadroxilo',
  'Cefalexina (Keflex)',
  'Cefazolina',
  'Cefepima',
  'Cefixima',
  'Cefprozilo',
  'Ceftazidima',
  'Ceftriaxona (Rocefin)',
  'Cefuroxima',

  // ── Antibióticos — Macrólidos ─────────────────────────────────────────────
  'Azitromicina (Zitromax)',
  'Claritromicina (Klaricid)',
  'Eritromicina',
  'Espiramicina',
  'Roxitromicina',

  // ── Antibióticos — Fluoroquinolonas ──────────────────────────────────────
  'Ciprofloxacino (Ciprobay)',
  'Levofloxacino (Tavanic)',
  'Moxifloxacino (Avelox)',
  'Norfloxacino',
  'Ofloxacino',

  // ── Antibióticos — Tetraciclinas ──────────────────────────────────────────
  'Doxiciclina',
  'Minociclina',
  'Tetraciclina',

  // ── Antibióticos — Otros ──────────────────────────────────────────────────
  'Clindamicina (Dalacin)',
  'Cotrimoxazol / Trimetoprim + Sulfametoxazol (Bactrim)',
  'Fosfomicina (Monurol)',
  'Gentamicina',
  'Linezolid (Zyvox)',
  'Metronidazol (Flagyl)',
  'Nitrofurantoína',
  'Rifampicina',
  'Tobramicina',
  'Vancomicina',

  // ── Antibióticos — Antituberculosos ──────────────────────────────────────
  'Etambutol',
  'Isoniazida',
  'Pirazinamida',
  'Rifampicina + Isoniazida (Rimactazid)',

  // ── Antifúngicos sistémicos ───────────────────────────────────────────────
  'Anfotericina B',
  'Fluconazol (Diflucan)',
  'Itraconazol (Sporanox)',
  'Ketoconazol',
  'Terbinafina (Lamisil)',
  'Voriconazol (Vfend)',

  // ── Antifúngicos tópicos ──────────────────────────────────────────────────
  'Bifonazol (Mycospor)',
  'Clotrimazol (Canesten)',
  'Econazol',
  'Miconazol (Daktarin)',
  'Nistatina (Mycostatin)',
  'Sertaconazol',
  'Tioconazol',

  // ── Antivirales ───────────────────────────────────────────────────────────
  'Aciclovir (Zovirax)',
  'Aciclovir crema tópica (Zovirax crema)',
  'Entecavir (Baraclude)',
  'Ganciclovir',
  'Interferón alfa',
  'Oseltamivir (Tamiflu)',
  'Ribavirina',
  'Sofosbuvir (Sovaldi)',
  'Sofosbuvir + Velpatasvir (Epclusa)',
  'Tenofovir (Viread)',
  'Valaciclovir (Valtrex)',
  'Valganciclovir (Valcyte)',

  // ── Antiretrovirales (VIH) ────────────────────────────────────────────────
  'Abacavir + Lamivudina (Kivexa)',
  'Atazanavir (Reyataz)',
  'Dolutegravir (Tivicay)',
  'Efavirenz (Stocrin)',
  'Emtricitabina + Tenofovir (Truvada)',
  'Lopinavir + Ritonavir (Kaletra)',
  'Nevirapina (Viramune)',
  'Raltegravir (Isentress)',

  // ── Antiparasitarios ─────────────────────────────────────────────────────
  'Albendazol (Zentel)',
  'Ivermectina (Ivexterm, Ivermek)',
  'Mebendazol (Vermox)',
  'Metronidazol — Giardia / Amebas (Flagyl)',
  'Nitazoxanida (Colufase)',
  'Permetrina 5% crema (Kwell, Nix)',
  'Praziquantel (Cisticid)',
  'Secnidazol (Secnil)',
  'Tinidazol (Fasigyn)',

  // ── Antihipertensivos — IECA ──────────────────────────────────────────────
  'Benazepril',
  'Captopril',
  'Cilazapril',
  'Enalapril (Renitec)',
  'Fosinopril',
  'Lisinopril (Zestril)',
  'Perindopril (Coversyl)',
  'Quinapril',
  'Ramipril (Tritace)',
  'Trandolapril',

  // ── Antihipertensivos — ARA II (sartanes) ────────────────────────────────
  'Candesartán (Atacand)',
  'Irbesartán (Aprovel)',
  'Losartán (Cozaar)',
  'Olmesartán (Olmetec)',
  'Telmisartán (Micardis)',
  'Valsartán (Diovan)',

  // ── Antihipertensivos — Calcioantagonistas ────────────────────────────────
  'Amlodipino (Norvasc)',
  'Diltiazem (Cardizem)',
  'Felodipino (Plendil)',
  'Lercanidipino (Zanidip)',
  'Nifedipino (Adalat)',
  'Nitrendipino',
  'Verapamilo (Isoptina)',

  // ── Antihipertensivos — Betabloqueadores ──────────────────────────────────
  'Atenolol (Tenormin)',
  'Bisoprolol (Concor)',
  'Carvedilol (Coreg)',
  'Labetalol',
  'Metoprolol (Lopressor, Betaloc)',
  'Nebivolol (Nebilet)',
  'Propranolol (Inderal)',

  // ── Antihipertensivos — Diuréticos ────────────────────────────────────────
  'Amilorida + Hidroclorotiazida',
  'Clortalidona',
  'Espironolactona (Aldactone)',
  'Furosemida (Lasix)',
  'Hidroclorotiazida',
  'Indapamida (Natrilix)',
  'Torasemida (Dilutol)',

  // ── Antihipertensivos — Otros ─────────────────────────────────────────────
  'Alfa-metildopa (Aldomet)',
  'Clonidina',
  'Doxazosina (Cardura)',
  'Hidralazina',
  'Moxonidina (Physiotens)',
  'Prazosina',
  'Sacubitrilo + Valsartán (Entresto)',

  // ── Antiangínicos y cardíacos ─────────────────────────────────────────────
  'Amiodarona (Cordarone)',
  'Digoxina (Lanoxin)',
  'Ivabradina (Procoralan)',
  'Nitroglicerina parches (Minitran)',
  'Nitroglicerina sublingual (Nitrolingual)',
  'Ranolazina (Ranexa)',
  'Trimetazidina (Vastarel)',

  // ── Anticoagulantes y antiagregantes ──────────────────────────────────────
  'Ácido acetilsalicílico 100 mg (AAS, Aspirina Cardio)',
  'Apixabán (Eliquis)',
  'Clopidogrel (Plavix)',
  'Dabigatrán (Pradaxa)',
  'Enoxaparina (Clexane)',
  'Heparina sódica',
  'Prasugrel (Efient)',
  'Rivaroxabán (Xarelto)',
  'Ticagrelor (Brilinta)',
  'Warfarina (Coumadin)',

  // ── Hipolipemiantes ───────────────────────────────────────────────────────
  'Atorvastatina (Lipitor)',
  'Bezafibrato',
  'Ezetimiba (Ezetrol)',
  'Ezetimiba + Simvastatina (Inegy)',
  'Fenofibrato (Lipanthyl)',
  'Fluvastatina',
  'Gemfibrozilo',
  'Lovastatina',
  'Pitavastatina',
  'Pravastatina',
  'Rosuvastatina (Crestor)',
  'Simvastatina (Zocor)',

  // ── Antidiabéticos orales e inyectables ──────────────────────────────────
  'Canagliflozina (Invokana)',
  'Dapagliflozina (Farxiga)',
  'Dulaglutida (Trulicity)',
  'Empagliflozina (Jardiance)',
  'Exenatida (Byetta)',
  'Glibenclamida',
  'Gliclazida (Diamicron)',
  'Glimepirida (Amaryl)',
  'Glipizida',
  'Linagliptina (Trajenta)',
  'Liraglutida (Victoza)',
  'Metformina (Glucophage)',
  'Pioglitazona (Actos)',
  'Saxagliptina (Onglyza)',
  'Semaglutida oral (Rybelsus)',
  'Semaglutida inyectable (Ozempic)',
  'Sitagliptina (Januvia)',
  'Vildagliptina (Galvus)',

  // ── Insulinas ─────────────────────────────────────────────────────────────
  'Insulina aspártica (NovoRapid)',
  'Insulina degludec (Tresiba)',
  'Insulina detemir (Levemir)',
  'Insulina glargina (Lantus, Toujeo)',
  'Insulina glulisina (Apidra)',
  'Insulina lispro (Humalog)',
  'Insulina NPH (Insulatard, Humulin N)',
  'Insulina regular (Actrapid, Humulin R)',

  // ── Tiroides y paratiroides ───────────────────────────────────────────────
  'Calcitonina (Miacalcic)',
  'Carbimazol',
  'Levotiroxina (Eutirox)',
  'Metimazol (Danantizol)',
  'Propiltiouracilo',

  // ── Corticoides sistémicos ────────────────────────────────────────────────
  'Betametasona (Celestone)',
  'Budesonida oral',
  'Dexametasona (Decadron)',
  'Fludrocortisona (Florinef)',
  'Hidrocortisona (Solu-Cortef)',
  'Metilprednisolona (Solu-Medrol, Medrol)',
  'Prednisona',
  'Prednisolona',
  'Triamcinolona (Kenacort)',

  // ── Gastroprotectores y antiácidos ────────────────────────────────────────
  'Alginato + Antiácido (Gaviscon)',
  'Bismuto subcitrato (De-Nol)',
  'Domperidona (Motilium)',
  'Esomeprazol (Nexium)',
  'Hidróxido de aluminio + magnesio (Maalox)',
  'Lansoprazol (Ogasto)',
  'Metoclopramida (Plasil)',
  'Omeprazol (Losec)',
  'Pantoprazol (Pantoc)',
  'Rabeprazol (Pariet)',
  'Ranitidina',
  'Sucralfato (Urbal)',

  // ── Laxantes y antidiarreicos ─────────────────────────────────────────────
  'Bisacodilo (Dulcolax)',
  'Lactulosa (Duphalac)',
  'Loperamida (Imodium)',
  'Macrogol / PEG 3350 (Movicol)',
  'Metilcelulosa',
  'Psyllium (Metamucil)',
  'Racecadotrilo (Hidrasec)',
  'Simeticona (Luftal, Gas-X)',
  'Sorbitol',

  // ── Antiheméticos ─────────────────────────────────────────────────────────
  'Dimenhidrinato (Dramamine)',
  'Metoclopramida (Plasil)',
  'Ondansetrón (Zofran)',
  'Prometazina (Fenergan)',

  // ── Enfermedad inflamatoria intestinal / Hígado ───────────────────────────
  'Azatioprina (Imuran)',
  'Infliximab (Remicade)',
  'Mesalazina (Pentasa, Asacol)',
  'Ursodiol / Ácido ursodesoxicólico (Ursofalk)',

  // ── Broncodilatadores y asma / EPOC ──────────────────────────────────────
  'Bromuro de ipratropio (Atrovent)',
  'Budesonida inhalada (Pulmicort)',
  'Budesonida + Formoterol (Symbicort)',
  'Fluticasona inhalada (Flixotide)',
  'Fluticasona + Salmeterol (Seretide)',
  'Fluticasona + Vilanterol (Relvar)',
  'Formoterol (Foradil)',
  'Montelukast (Singulair)',
  'Roflumilast (Daxas)',
  'Salbutamol (Ventolin, Salbulair)',
  'Salmeterol (Serevent)',
  'Teofilina',
  'Tiotropio (Spiriva)',
  'Umeclidinio + Vilanterol (Anoro)',

  // ── Sistema respiratorio — otros ──────────────────────────────────────────
  'Acetilcisteína (Fluimucil)',
  'Ambroxol (Mucosolvan)',
  'Beclometasona nasal (Beconase)',
  'Bromhexina',
  'Budesonida nasal (Rhinocort)',
  'Dextrometorfano',
  'Fluticasona nasal (Flixonase)',
  'Guaifenesina',
  'Mometasona nasal (Nasonex)',

  // ── Antihistamínicos ─────────────────────────────────────────────────────
  'Cetirizina (Zyrtec)',
  'Clorfenamina (Chlor-Trimeton, Antistamínico)',
  'Desloratadina (Aerius)',
  'Difenhidramina (Benadryl)',
  'Ebastina (Ebastel)',
  'Fexofenadina (Allegra)',
  'Hidroxizina (Atarax)',
  'Ketotifeno (Zaditen)',
  'Levocetirizina (Xyzal)',
  'Loratadina (Clarityne)',
  'Mizolastina',
  'Rupatadina (Rupafin)',

  // ── Antidepresivos — ISRS ─────────────────────────────────────────────────
  'Citalopram (Cipramil)',
  'Escitalopram (Lexapro)',
  'Fluoxetina (Prozac)',
  'Fluvoxamina (Luvox)',
  'Paroxetina (Paxil)',
  'Sertralina (Zoloft)',

  // ── Antidepresivos — IRSN ─────────────────────────────────────────────────
  'Desvenlafaxina (Pristiq)',
  'Duloxetina (Cymbalta)',
  'Venlafaxina (Effexor)',

  // ── Antidepresivos — Tricíclicos ──────────────────────────────────────────
  'Amitriptilina (Tryptanol)',
  'Clomipramina (Anafranil)',
  'Desipramina',
  'Imipramina',
  'Nortriptilina',

  // ── Antidepresivos — Otros ────────────────────────────────────────────────
  'Agomelatina (Valdoxan)',
  'Bupropión (Wellbutrin, Zyban)',
  'Mianserina',
  'Mirtazapina (Remeron)',
  'Trazodona (Trittico)',
  'Vortioxetina (Brintellix)',

  // ── Ansiolíticos e hipnóticos ────────────────────────────────────────────
  'Alprazolam (Tafil)',
  'Bromazepam (Lexotanil)',
  'Brotizolam',
  'Buspirona',
  'Clonazepam (Rivotril)',
  'Diazepam (Valium)',
  'Lorazepam (Ativan)',
  'Midazolam',
  'Triazolam',
  'Zolpidem (Stilnox)',
  'Zopiclona (Imovane)',

  // ── Antipsicóticos — Típicos ──────────────────────────────────────────────
  'Clorpromazina (Largactil)',
  'Haloperidol (Haldol)',
  'Perfenazina',
  'Trifluoperazina',

  // ── Antipsicóticos — Atípicos ─────────────────────────────────────────────
  'Aripiprazol (Abilify)',
  'Asenapina (Sycrest)',
  'Clozapina (Leponex)',
  'Lurasidona (Latuda)',
  'Olanzapina (Zyprexa)',
  'Paliperidona (Invega)',
  'Quetiapina (Seroquel)',
  'Risperidona (Risperdal)',
  'Ziprasidona (Geodon)',

  // ── Estabilizadores del ánimo ─────────────────────────────────────────────
  'Carbonato de litio (Plenur)',
  'Lamotrigina (Lamictal)',
  'Valproato / Ácido valproico (Depakote)',

  // ── Anticonvulsivantes ────────────────────────────────────────────────────
  'Carbamazepina (Tegretol)',
  'Clonazepam (Rivotril)',
  'Etosuximida',
  'Fenitoína / Difenilhidantoína (Epamin)',
  'Fenobarbital',
  'Gabapentina (Neurontin)',
  'Lacosamida (Vimpat)',
  'Levetiracetam (Keppra)',
  'Oxcarbazepina (Trileptal)',
  'Perampanel (Fycompa)',
  'Pregabalina (Lyrica)',
  'Topiramato (Topamax)',
  'Vigabatrina',
  'Zonisamida',

  // ── Antiparkinsonianos ────────────────────────────────────────────────────
  'Amantadina',
  'Biperiden (Akineton)',
  'Entacapona (Comtan)',
  'Levodopa + Benserazida (Madopar)',
  'Levodopa + Carbidopa (Sinemet)',
  'Pramipexol (Mirapex)',
  'Rasagilina (Azilect)',
  'Ropinirol (Requip)',
  'Selegilina',

  // ── Demencia y Alzheimer ──────────────────────────────────────────────────
  'Donepezilo (Aricept)',
  'Galantamina (Reminyl)',
  'Memantina (Ebixa)',
  'Rivastigmina (Exelon)',

  // ── Trastorno por déficit de atención (TDAH) ──────────────────────────────
  'Atomoxetina (Strattera)',
  'Lisdexanfetamina (Vyvanse)',
  'Metilfenidato (Ritalin, Concerta)',

  // ── Migraña ───────────────────────────────────────────────────────────────
  'Almotriptán',
  'Ergotamina + Cafeína (Cafergot)',
  'Naratriptán',
  'Rizatriptán (Maxalt)',
  'Sumatriptán (Imigran)',
  'Topiramato — profilaxis migraña',
  'Zolmitriptán',

  // ── Neurología — otros ────────────────────────────────────────────────────
  'Baclofeno (Lioresal)',
  'Betahistina (Serc)',
  'Citicolina (Somazina)',
  'Piracetam',
  'Riluzol (Rilutek)',
  'Tizanidina (Sirdalud)',
  'Toxina botulínica tipo A (Botox, Dysport)',

  // ── Relajantes musculares ─────────────────────────────────────────────────
  'Baclofeno (Lioresal)',
  'Carisoprodol',
  'Ciclobenzaprina (Flexeril)',
  'Metocarbamol (Robaxin)',
  'Orfenadrina',
  'Tizanidina (Sirdalud)',

  // ── Reumatología / Inmunosupresores ──────────────────────────────────────
  'Abatacept (Orencia)',
  'Adalimumab (Humira)',
  'Azatioprina (Imuran)',
  'Ciclofosfamida',
  'Ciclosporina (Sandimmun)',
  'Etanercept (Enbrel)',
  'Hidroxicloroquina (Plaquenil)',
  'Leflunomida (Arava)',
  'Metotrexato (Methotrexate)',
  'Micofenolato mofetilo (CellCept)',
  'Rituximab (MabThera)',
  'Sulfasalazina',
  'Tocilizumab (Actemra)',

  // ── Gota y hiperuricemia ──────────────────────────────────────────────────
  'Alopurinol',
  'Colchicina',
  'Febuxostat (Adenuric)',

  // ── Osteoporosis ──────────────────────────────────────────────────────────
  'Ácido alendrónico (Fosamax)',
  'Ácido ibandrónico (Bonviva)',
  'Ácido risedrónico (Actonel)',
  'Ácido zoledrónico (Aclasta)',
  'Denosumab (Prolia)',
  'Raloxifeno (Evista)',
  'Ranelato de estroncio',
  'Teriparatida (Forteo)',

  // ── Ginecología y obstetricia ─────────────────────────────────────────────
  'Clotrimazol óvulos vaginales (Canesten V)',
  'Dienogest (Visanne)',
  'Dinoprostona',
  'Drospirenona + Etinilestradiol (Yasmin)',
  'Estradiol (Estrofem)',
  'Estradiol + Norgestimato (Prefest)',
  'Estriol crema vaginal (Ovestin)',
  'Etonogestrel implante (Implanon)',
  'Gestodeno + Etinilestradiol (Femoden)',
  'Levonorgestrel 0,75 mg (Postinor, Tace)',
  'Levonorgestrel DIU (Mirena)',
  'Levonorgestrel + Etinilestradiol (Microgynon)',
  'Medroxiprogesterona (Depo-Provera)',
  'Mifepristona',
  'Misoprostol (Cytotec)',
  'Norelgestromina + Etinilestradiol parche (Evra)',
  'Progesterona micronizada (Utrogestan)',
  'Tibolona (Livial)',
  'Ulipristal (EllaOne)',

  // ── Andrología y urología ─────────────────────────────────────────────────
  'Alfuzosina (Xatral)',
  'Dutasterida (Avodart)',
  'Finasterida (Proscar)',
  'Oxibutinina (Ditropan)',
  'Sildenafil (Viagra)',
  'Solifenacina (Vesicare)',
  'Tadalafil (Cialis)',
  'Tamsulosina (Omnic)',
  'Tolterodina (Detrusitol)',
  'Vardenafil (Levitra)',

  // ── Nefrología ────────────────────────────────────────────────────────────
  'Cinacalcet (Mimpara)',
  'Darbepoyetina alfa (Aranesp)',
  'Eritropoyetina (Eprex)',
  'Sevelamer (Renagel)',

  // ── Hematología ───────────────────────────────────────────────────────────
  'Ácido fólico',
  'Azacitidina (Vidaza)',
  'Deferoxamina (Desferal)',
  'Deferasirox (Exjade)',
  'Eltrombopag (Revolade)',
  'Eritropoyetina (Eprex)',
  'Filgrastim (Neupogen)',
  'Hidroxiurea (Hydrea)',
  'Hierro sacarosa IV (Venofer)',
  'Lenalidomida (Revlimid)',
  'Romiplostim (Nplate)',

  // ── Oncología — quimioterapia ─────────────────────────────────────────────
  'Bevacizumab (Avastin)',
  'Bortezomib (Velcade)',
  'Capecitabina (Xeloda)',
  'Carboplatino',
  'Cisplatino',
  'Ciclofosfamida',
  'Docetaxel (Taxotere)',
  'Doxorrubicina (Adriamycin)',
  'Erlotinib (Tarceva)',
  'Etoposido',
  'Fluorouracilo (5-FU)',
  'Gencitabina (Gemzar)',
  'Imatinib (Gleevec)',
  'Irinotecan',
  'Letrozol (Femara)',
  'Metotrexato',
  'Oxaliplatino (Eloxatin)',
  'Paclitaxel (Taxol)',
  'Tamoxifeno (Nolvadex)',
  'Trastuzumab (Herceptin)',
  'Vinorelbina',

  // ── Vitaminas y suplementos minerales ────────────────────────────────────
  'Biotina (Vitamina B7)',
  'Calcio + Vitamina D3 (Calcio-D3)',
  'Calcio carbonato',
  'Cianocobalamina / Vitamina B12 (Bedoyecta)',
  'Colecalciferol / Vitamina D3 (D-Tabs, Vigantol)',
  'Complejo B',
  'Ergocalciferol / Vitamina D2',
  'Hierro polimaltosa (Ferrifer, Maltofer)',
  'Hierro sulfato ferroso',
  'Magnesio (citrato, óxido)',
  'Manganeso',
  'Omega-3 / Ácidos grasos EPA+DHA',
  'Piridoxina / Vitamina B6',
  'Potasio cloruro',
  'Riboflavina / Vitamina B2',
  'Selenio',
  'Tiamina / Vitamina B1',
  'Vitamina A (Retinol)',
  'Vitamina C (Ácido ascórbico)',
  'Vitamina E (Tocoferol)',
  'Vitamina K (Fitomenadiona)',
  'Zinc (gluconato, sulfato)',

  // ── Dermatología — uso tópico ─────────────────────────────────────────────
  'Adapaleno gel (Differin)',
  'Ácido azelaico crema',
  'Ácido salicílico',
  'Bencilo benzoato (Escabicida)',
  'Betametasona + Clotrimazol crema (Fucidín)',
  'Betametasona crema / pomada (Rinderon)',
  'Calcipotriol (Daivonex)',
  'Clobetasol crema (Dermovate)',
  'Dapsona gel (Aczone)',
  'Eritromicina tópica (Erytop)',
  'Fluorouracilo crema (Efudix)',
  'Hidrocortisona crema',
  'Imiquimod crema (Aldara)',
  'Mometasona crema (Elocom)',
  'Mupirocina pomada (Bactroban)',
  'Peróxido de benzoílo',
  'Pimecrolimus crema (Elidel)',
  'Tacrolimus ungüento (Protopic)',
  'Tretinoína / Ácido retinoico (Retin-A)',

  // ── Dermatología — uso sistémico ──────────────────────────────────────────
  'Acitretina (Neotigason)',
  'Doxiciclina — Acné',
  'Dupilumab (Dupixent)',
  'Isotretinoína (Roaccutan)',
  'Metotrexato — Psoriasis',

  // ── Oftalmología ─────────────────────────────────────────────────────────
  'Atropina colirio',
  'Azitromicina colirio (Azidrop)',
  'Betaxolol colirio (Betoptic)',
  'Bimatoprost colirio (Lumigan)',
  'Brinzolamida colirio (Azopt)',
  'Brimonidina colirio (Alphagan)',
  'Carboximetilcelulosa lágrimas artificiales (Refresh)',
  'Ciprofloxacino colirio (Ciloxan)',
  'Dexametasona colirio',
  'Diclofenaco colirio',
  'Dorzolamida + Timolol colirio (Cosopt)',
  'Hialuronato sódico colirio',
  'Latanoprost colirio (Xalatan)',
  'Levobunolol colirio',
  'Moxifloxacino colirio (Vigamox)',
  'Ofloxacino colirio',
  'Pilocarpina colirio',
  'Prednisolona colirio',
  'Timolol colirio (Timoptol)',
  'Tobramicina colirio (Tobrex)',
  'Tobramicina + Dexametasona colirio (Tobradex)',
  'Travoprost colirio (Travatan)',

  // ── Otorrinolaringología ──────────────────────────────────────────────────
  'Ciprofloxacino gotas óticas (Ciloxan ótico)',
  'Cloruro de sodio solución isotónica nasal',
  'Neomicina + Polimixina + Hidrocortisona gotas óticas (Otosporin)',
  'Oximetazolina nasal (Afrin)',
  'Xilometazolina nasal (Otrivin)',

  // ── Anestesia y dolor procedural ─────────────────────────────────────────
  'Bupivacaína (Marcaína)',
  'Fentanilo inyectable',
  'Ketamina',
  'Lidocaína (Xilocaína)',
  'Mepivacaína (Scandicaín)',
  'Propofol (Diprivan)',
  'Ropivacaína (Naropin)',

  // ── Antiulceroso — erradicación H. pylori ────────────────────────────────
  'Amoxicilina + Claritromicina + Omeprazol (Terapia triple H. pylori)',
  'Bismuto + Metronidazol + Tetraciclina + IBP (Terapia cuádruple H. pylori)',

  // ── Soluciones de hidratación y electrolitos ──────────────────────────────
  'Sales de rehidratación oral (Pedialyte, Electrolyt)',
  'Suero fisiológico / Cloruro de sodio 0,9%',
  'Suero glucosado 5%',

  // ── Otros frecuentes en atención primaria ─────────────────────────────────
  'Alopurinol',
  'Betahistina (Serc)',
  'Colchicina',
  'Dimenhidrinato (Dramamine)',
  'Finasterida',
  'Gabapentina (Neurontin)',
  'Loperamida (Imodium)',
  'Melatonina',
  'Metformina (Glucophage)',
  'Misoprostol (Cytotec)',
  'Pregabalina (Lyrica)',
  'Simeticona (Luftal)',
  'Sumatriptán (Imigran)',
  'Vitamina D3 (Colecalciferol)',
]
  // Eliminar duplicados exactos y ordenar alfabéticamente
  .filter((med, index, self) => self.indexOf(med) === index)
  .sort((a, b) =>
    a.localeCompare(b, 'es', { sensitivity: 'base' })
  )
