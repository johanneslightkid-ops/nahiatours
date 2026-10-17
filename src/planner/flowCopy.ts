import type { StepId } from './questions';

/**
 * The words around the questions rather than the questions themselves: why
 * each one is asked, a small true thing about the coast to keep the guest
 * looking forward while they answer, the fine-tune panel on the plan, and
 * everything the voice guide says or listens for.
 *
 * Kept apart from copy.ts so the four large copy objects there stay exactly
 * as the admin and the engine already know them.
 */
export interface FlowCopy {
  whyLabel: string;
  why: Record<StepId, string>;
  spark: Partial<Record<StepId, string>>;
  takingShape: string;
  takingShapeEmpty: string;
  nothingApplies: string;
  updatePlan: string;
  fineTune: string;
  refine: {
    title: string;
    hint: string;
    notSet: string;
    /** What each optional answer changes, shown on its card. */
    impact: Partial<Record<StepId, string>>;
    /** Short card titles. */
    label: Partial<Record<StepId, string>>;
  };
  minutes: (questions: string) => string;
  /** Shown on the intro, on phones only. */
  voiceTeaser: string;
  voice: {
    on: string;
    off: string;
    title: string;
    blurb: string;
    privacy: string;
    tapToSpeak: string;
    listening: string;
    speaking: string;
    heard: (text: string) => string;
    didntCatch: string;
    youCanSay: string;
    or: string;
    multiDone: string;
    counts: string;
    days: string;
    logistics: string;
    constraintsNone: string;
    noMic: string;
    micBlocked: string;
    repeat: string;
  };
}

const en: FlowCopy = {
  whyLabel: 'Why we ask',
  why: {
    partyType: 'A honeymoon and a family of five need different boats, different hours and different lunches.',
    headcount: 'Every price on the plan is worked out for exactly this many people — no surprises later.',
    interests: 'This weighs more than anything else: it decides which excursions make the shortlist at all.',
    energy: 'It sets the pace — a hammock day and a mud-and-zip-line day are both perfect, for different people.',
    adultAge: 'Only to tune comfort: long bumpy rides, late nights and early starts land differently at 25 and 65.',
    days: 'With more days we can spread the big ones out and never send you to the same coast twice.',
    occasion: 'A celebration changes the little touches — and sometimes the whole day.',
    constraints: 'So nobody spends the day sea-sick, stranded on a ladder or awake at 5 a.m. against their will.',
    budget: 'Keeps the plan inside what feels comfortable, per person and per day.',
    dayShape: 'Some people want one perfect day; others want the morning, the afternoon and the night.',
    aim: 'The feeling you want to fly home with breaks ties between two good options.',
    transport: 'Hotel pick-up is always included; this only matters if you want your own driver.',
    logistics: 'Optional — it just lets us confirm availability faster.',
  },
  spark: {
    partyType: 'Most people here stay about a week and pick two or three excursion days, with beach days in between.',
    interests: 'On the same coast: a sandbar where you stand waist-deep in the open sea, reefs ten minutes off the beach, and cacao farms an hour inland.',
    energy: 'Bávaro’s water is calm on the reef side most mornings — perfect for gentle days and fast boats alike.',
    adultAge: 'The countryside tours and island days are easy on the body; buggies and zip lines are the bumpy ones.',
    days: 'Tip: put the long island day early in your week, while everyone is still fresh.',
    occasion: 'Saona’s lobster day and a private speedboat are the classic honeymoon pair.',
    constraints: 'Non-swimmers still love Saona: the natural pool is only waist-deep.',
  },
  takingShape: 'Your day is taking shape',
  takingShapeEmpty: 'Answer a couple of questions and your day appears here.',
  nothingApplies: 'Nothing — build my day',
  updatePlan: 'Update my plan',
  fineTune: 'Fine-tune',
  refine: {
    title: 'Fine-tune your plan',
    hint: 'All optional. Each one takes a tap and changes the plan right away.',
    notSet: 'Not set',
    impact: {
      budget: 'Keeps every day inside a comfortable price',
      dayShape: 'One perfect thing a day, or as much as fits',
      aim: 'Breaks ties between two good options',
      transport: 'Private driver or the included pick-up',
      occasion: 'Birthdays, reunions and honeymoons get their classics',
      logistics: 'Your date and hotel for a faster reply',
    },
    label: {
      budget: 'Budget',
      dayShape: 'Pace of the day',
      aim: 'What to take home',
      transport: 'Getting around',
      occasion: 'Celebrating?',
      logistics: 'Date & hotel',
    },
  },
  minutes: (n) => `≈ 45 seconds · ${n} quick questions · no signup`,
  voiceTeaser: 'On your phone? Switch on the voice guide: it reads every question aloud and you answer by saying an option.',
  voice: {
    on: 'Voice guide on',
    off: 'Voice guide',
    title: 'Plan hands-free',
    blurb: 'I read each question aloud and you just say one of the options.',
    privacy: 'Your phone’s own speech service turns your words into text; nothing is recorded here.',
    tapToSpeak: 'Tap to answer by voice',
    listening: 'Listening — say an option',
    speaking: 'Reading the question…',
    heard: (text) => `Heard: “${text}”`,
    didntCatch: 'Sorry, I didn’t catch that. Say one of the options, or just tap it.',
    youCanSay: 'You can say',
    or: 'or',
    multiDone: 'Say as many as you like, then say done.',
    counts: 'Set the numbers with the plus and minus buttons, then say continue.',
    days: 'Say a number from one to five.',
    logistics: 'Fill these in if you like, or say continue.',
    constraintsNone: 'or say nothing, if nothing applies.',
    noMic: 'Your browser can read aloud but not listen — tap your answer.',
    micBlocked: 'Microphone blocked — allow it in your browser, or tap your answer.',
    repeat: 'Repeat',
  },
};

const es: FlowCopy = {
  whyLabel: 'Por qué preguntamos',
  why: {
    partyType: 'Una luna de miel y una familia de cinco necesitan otro barco, otros horarios y otro almuerzo.',
    headcount: 'Cada precio del plan se calcula para este número exacto de personas — sin sorpresas después.',
    interests: 'Es lo que más pesa: decide qué excursiones entran en la selección.',
    energy: 'Marca el ritmo — un día de hamaca y uno de barro y tirolina son perfectos, para gente distinta.',
    adultAge: 'Solo para ajustar la comodidad: los caminos con baches, las noches largas y los madrugones no se viven igual a los 25 que a los 65.',
    days: 'Con más días repartimos lo grande y nunca los mandamos dos veces a la misma costa.',
    occasion: 'Una celebración cambia los detalles — y a veces el día entero.',
    constraints: 'Para que nadie pase el día mareado, en una escalera o despierto a las 5 de la mañana sin quererlo.',
    budget: 'Mantiene el plan dentro de lo que les resulta cómodo, por persona y por día.',
    dayShape: 'Hay quien quiere un solo día perfecto y quien quiere la mañana, la tarde y la noche.',
    aim: 'La sensación con la que quieren volver a casa decide entre dos buenas opciones.',
    transport: 'El traslado desde el hotel siempre está incluido; esto solo importa si quieren chofer propio.',
    logistics: 'Opcional — solo nos ayuda a confirmar disponibilidad más rápido.',
  },
  spark: {
    partyType: 'La mayoría se queda alrededor de una semana y elige dos o tres días de excursión, con días de playa entre medio.',
    interests: 'En la misma costa: un banco de arena donde se está con el agua a la cintura en pleno mar, arrecifes a diez minutos de la playa y fincas de cacao a una hora tierra adentro.',
    energy: 'Las mañanas en Bávaro suelen tener el mar en calma del lado del arrecife — ideal para días tranquilos y para lanchas rápidas.',
    adultAge: 'Los tours de campo y los días de isla son suaves para el cuerpo; los buggies y la tirolina son los movidos.',
    days: 'Consejo: dejen el día largo de isla para el comienzo de la semana, cuando todos están con energía.',
    occasion: 'El día de langosta en Saona y una lancha privada son la pareja clásica de una luna de miel.',
    constraints: 'Quien no nada también disfruta Saona: la piscina natural llega solo a la cintura.',
  },
  takingShape: 'Su día va tomando forma',
  takingShapeEmpty: 'Respondan un par de preguntas y su día aparece aquí.',
  nothingApplies: 'Nada — armar mi día',
  updatePlan: 'Actualizar mi plan',
  fineTune: 'Ajustar',
  refine: {
    title: 'Ajusten su plan',
    hint: 'Todo opcional. Cada ajuste es un toque y cambia el plan al instante.',
    notSet: 'Sin definir',
    impact: {
      budget: 'Mantiene cada día en un precio cómodo',
      dayShape: 'Una sola cosa perfecta por día, o todo lo que quepa',
      aim: 'Decide entre dos buenas opciones',
      transport: 'Chofer privado o el traslado incluido',
      occasion: 'Cumpleaños, reencuentros y lunas de miel tienen sus clásicos',
      logistics: 'Fecha y hotel para responder más rápido',
    },
    label: {
      budget: 'Presupuesto',
      dayShape: 'Ritmo del día',
      aim: 'Qué llevarse',
      transport: 'Traslados',
      occasion: '¿Celebran algo?',
      logistics: 'Fecha y hotel',
    },
  },
  minutes: (n) => `≈ 45 segundos · ${n} preguntas rápidas · sin registro`,
  voiceTeaser: '¿Desde el teléfono? Activen la guía por voz: lee cada pregunta en voz alta y ustedes responden diciendo una opción.',
  voice: {
    on: 'Guía por voz activa',
    off: 'Guía por voz',
    title: 'Planeen con la voz',
    blurb: 'Leo cada pregunta en voz alta y ustedes solo dicen una de las opciones.',
    privacy: 'El servicio de voz de su teléfono convierte sus palabras en texto; aquí no se graba nada.',
    tapToSpeak: 'Toquen para responder con la voz',
    listening: 'Escuchando — digan una opción',
    speaking: 'Leyendo la pregunta…',
    heard: (text) => `Escuché: «${text}»`,
    didntCatch: 'Perdón, no entendí. Digan una de las opciones o simplemente tóquenla.',
    youCanSay: 'Pueden decir',
    or: 'o',
    multiDone: 'Digan todas las que quieran y luego digan listo.',
    counts: 'Ajusten los números con los botones de más y menos, y luego digan continuar.',
    days: 'Digan un número del uno al cinco.',
    logistics: 'Complétenlo si quieren, o digan continuar.',
    constraintsNone: 'o digan nada, si no aplica ninguna.',
    noMic: 'Su navegador puede leer en voz alta pero no escuchar — toquen su respuesta.',
    micBlocked: 'Micrófono bloqueado — permítanlo en el navegador o toquen su respuesta.',
    repeat: 'Repetir',
  },
};

const de: FlowCopy = {
  whyLabel: 'Warum wir fragen',
  why: {
    partyType: 'Flitterwochen und eine fünfköpfige Familie brauchen ein anderes Boot, andere Zeiten und ein anderes Mittagessen.',
    headcount: 'Jeder Preis im Plan wird für genau so viele Personen berechnet — ohne spätere Überraschungen.',
    interests: 'Das zählt am meisten: Es entscheidet, welche Ausflüge überhaupt in die engere Wahl kommen.',
    energy: 'Es bestimmt das Tempo — ein Hängemattentag und ein Tag mit Schlamm und Zipline sind beide perfekt, nur für verschiedene Menschen.',
    adultAge: 'Nur für den Komfort: Holprige Fahrten, lange Nächte und frühe Abfahrten fühlen sich mit 25 anders an als mit 65.',
    days: 'Mit mehr Tagen verteilen wir die großen Ausflüge und schicken dich nie zweimal an dieselbe Küste.',
    occasion: 'Ein Anlass ändert die kleinen Details — und manchmal den ganzen Tag.',
    constraints: 'Damit niemand den Tag seekrank, auf einer Leiter oder unfreiwillig um 5 Uhr wach verbringt.',
    budget: 'Hält den Plan in einem Rahmen, der sich gut anfühlt — pro Person und Tag.',
    dayShape: 'Manche wollen einen einzigen perfekten Ausflug, andere den Vormittag, den Nachmittag und den Abend.',
    aim: 'Das Gefühl, mit dem du nach Hause fliegen willst, entscheidet zwischen zwei guten Optionen.',
    transport: 'Die Abholung im Hotel ist immer inklusive; das zählt nur, wenn du einen eigenen Fahrer möchtest.',
    logistics: 'Freiwillig — es hilft uns nur, die Verfügbarkeit schneller zu bestätigen.',
  },
  spark: {
    partyType: 'Die meisten bleiben hier eine Woche oder länger und wählen zwei, drei Ausflugstage mit Strandtagen dazwischen.',
    interests: 'An derselben Küste: eine Sandbank, auf der man hüfttief mitten im Meer steht, Riffe zehn Minuten vom Strand und Kakaofarmen eine Stunde landeinwärts.',
    energy: 'Morgens ist das Meer vor Bávaro auf der Riffseite meist ruhig — ideal für gemütliche Tage wie für schnelle Boote.',
    adultAge: 'Landtouren und Inseltage sind körperlich leicht; Buggys und Ziplines sind die holprigen.',
    days: 'Tipp: Den langen Inseltag früh in die Woche legen, solange alle noch frisch sind.',
    occasion: 'Der Hummertag auf Saona und ein privates Speedboot sind das klassische Flitterwochen-Duo.',
    constraints: 'Auch Nichtschwimmer lieben Saona: Das Naturbecken ist nur hüfttief.',
  },
  takingShape: 'Dein Tag nimmt Gestalt an',
  takingShapeEmpty: 'Beantworte ein, zwei Fragen und dein Tag erscheint hier.',
  nothingApplies: 'Nichts davon — Tag planen',
  updatePlan: 'Plan aktualisieren',
  fineTune: 'Feinschliff',
  refine: {
    title: 'Feinschliff für deinen Plan',
    hint: 'Alles freiwillig. Ein Tipp genügt, und der Plan ändert sich sofort.',
    notSet: 'Nicht festgelegt',
    impact: {
      budget: 'Hält jeden Tag in einem angenehmen Preisrahmen',
      dayShape: 'Ein perfekter Ausflug pro Tag oder so viel, wie passt',
      aim: 'Entscheidet zwischen zwei guten Optionen',
      transport: 'Eigener Fahrer oder die inklusive Abholung',
      occasion: 'Geburtstage, Familientreffen und Flitterwochen bekommen ihre Klassiker',
      logistics: 'Datum und Hotel für eine schnellere Antwort',
    },
    label: {
      budget: 'Budget',
      dayShape: 'Tempo des Tages',
      aim: 'Was du mitnehmen willst',
      transport: 'Unterwegs',
      occasion: 'Etwas zu feiern?',
      logistics: 'Datum & Hotel',
    },
  },
  minutes: (n) => `≈ 45 Sekunden · ${n} kurze Fragen · ohne Anmeldung`,
  voiceTeaser: 'Am Handy? Schalte die Sprachführung ein: Sie liest jede Frage vor, und du antwortest, indem du eine Option sagst.',
  voice: {
    on: 'Sprachführung an',
    off: 'Sprachführung',
    title: 'Freihändig planen',
    blurb: 'Ich lese jede Frage vor, und du sagst einfach eine der Antworten.',
    privacy: 'Der Sprachdienst deines Handys wandelt deine Worte in Text um; hier wird nichts aufgezeichnet.',
    tapToSpeak: 'Tippen und per Stimme antworten',
    listening: 'Ich höre zu — sag eine Antwort',
    speaking: 'Die Frage wird vorgelesen…',
    heard: (text) => `Verstanden: „${text}“`,
    didntCatch: 'Entschuldigung, das habe ich nicht verstanden. Sag eine der Antworten oder tippe sie an.',
    youCanSay: 'Du kannst sagen',
    or: 'oder',
    multiDone: 'Sag so viele, wie du möchtest, und dann fertig.',
    counts: 'Stell die Zahlen mit Plus und Minus ein und sag dann weiter.',
    days: 'Sag eine Zahl von eins bis fünf.',
    logistics: 'Füll das aus, wenn du magst, oder sag weiter.',
    constraintsNone: 'oder sag nichts, wenn nichts davon zutrifft.',
    noMic: 'Dein Browser kann vorlesen, aber nicht zuhören — tippe deine Antwort an.',
    micBlocked: 'Mikrofon blockiert — erlaube es im Browser oder tippe deine Antwort an.',
    repeat: 'Wiederholen',
  },
};

const fr: FlowCopy = {
  whyLabel: 'Pourquoi on demande',
  why: {
    partyType: 'Une lune de miel et une famille de cinq n’ont besoin ni du même bateau, ni des mêmes horaires, ni du même déjeuner.',
    headcount: 'Chaque prix du plan est calculé pour exactement ce nombre de personnes — aucune surprise ensuite.',
    interests: 'C’est ce qui compte le plus : cela décide quelles excursions entrent dans la sélection.',
    energy: 'Cela fixe le rythme — une journée hamac et une journée boue et tyrolienne sont parfaites, pour des gens différents.',
    adultAge: 'Seulement pour le confort : les pistes cahoteuses, les nuits tardives et les départs à l’aube ne se vivent pas pareil à 25 et à 65 ans.',
    days: 'Avec plus de jours, on étale les grandes sorties et on ne vous envoie jamais deux fois sur la même côte.',
    occasion: 'Une fête change les petites attentions — et parfois toute la journée.',
    constraints: 'Pour que personne ne passe la journée avec le mal de mer, coincé sur une échelle ou réveillé à 5 h malgré lui.',
    budget: 'Garde le plan dans ce qui vous semble confortable, par personne et par jour.',
    dayShape: 'Certains veulent une seule journée parfaite, d’autres le matin, l’après-midi et le soir.',
    aim: 'Le sentiment que vous voulez rapporter départage deux bonnes options.',
    transport: 'Le ramassage à l’hôtel est toujours inclus ; cela ne compte que si vous voulez votre propre chauffeur.',
    logistics: 'Facultatif — cela nous aide seulement à confirmer les disponibilités plus vite.',
  },
  spark: {
    partyType: 'La plupart restent environ une semaine et choisissent deux ou trois journées d’excursion, avec des jours de plage entre les deux.',
    interests: 'Sur la même côte : un banc de sable où l’on a de l’eau à la taille en pleine mer, des récifs à dix minutes de la plage et des plantations de cacao à une heure dans les terres.',
    energy: 'Le matin, la mer est souvent calme côté récif à Bávaro — idéal pour les journées douces comme pour les bateaux rapides.',
    adultAge: 'Les sorties à la campagne et les journées sur l’île sont douces pour le corps ; les buggys et la tyrolienne sont les plus sportifs.',
    days: 'Conseil : placez la longue journée sur l’île en début de semaine, quand tout le monde est en forme.',
    occasion: 'La journée langouste à Saona et un hors-bord privé forment le duo classique d’une lune de miel.',
    constraints: 'Même ceux qui ne nagent pas adorent Saona : la piscine naturelle n’arrive qu’à la taille.',
  },
  takingShape: 'Votre journée prend forme',
  takingShapeEmpty: 'Répondez à une ou deux questions et votre journée apparaît ici.',
  nothingApplies: 'Rien de tout ça — créer ma journée',
  updatePlan: 'Mettre à jour mon plan',
  fineTune: 'Affiner',
  refine: {
    title: 'Affinez votre plan',
    hint: 'Tout est facultatif. Un toucher suffit, et le plan change aussitôt.',
    notSet: 'Non précisé',
    impact: {
      budget: 'Garde chaque journée à un prix confortable',
      dayShape: 'Une seule belle chose par jour, ou tout ce qui rentre',
      aim: 'Départage deux bonnes options',
      transport: 'Chauffeur privé ou ramassage inclus',
      occasion: 'Anniversaires, retrouvailles et lunes de miel ont leurs classiques',
      logistics: 'Date et hôtel pour une réponse plus rapide',
    },
    label: {
      budget: 'Budget',
      dayShape: 'Rythme de la journée',
      aim: 'Ce que vous voulez rapporter',
      transport: 'Déplacements',
      occasion: 'Une fête ?',
      logistics: 'Date et hôtel',
    },
  },
  minutes: (n) => `≈ 45 secondes · ${n} questions rapides · sans inscription`,
  voiceTeaser: 'Sur votre téléphone ? Activez le guide vocal : il lit chaque question à voix haute et vous répondez en disant une option.',
  voice: {
    on: 'Guide vocal activé',
    off: 'Guide vocal',
    title: 'Planifier à la voix',
    blurb: 'Je lis chaque question à voix haute et vous dites simplement une des réponses.',
    privacy: 'Le service vocal de votre téléphone transforme vos mots en texte ; rien n’est enregistré ici.',
    tapToSpeak: 'Touchez pour répondre à la voix',
    listening: 'J’écoute — dites une réponse',
    speaking: 'Lecture de la question…',
    heard: (text) => `Entendu : « ${text} »`,
    didntCatch: 'Désolé, je n’ai pas compris. Dites une des réponses, ou touchez-la.',
    youCanSay: 'Vous pouvez dire',
    or: 'ou',
    multiDone: 'Dites-en autant que vous voulez, puis dites terminé.',
    counts: 'Réglez les nombres avec les boutons plus et moins, puis dites continuer.',
    days: 'Dites un nombre de un à cinq.',
    logistics: 'Remplissez-les si vous voulez, ou dites continuer.',
    constraintsNone: 'ou dites rien, si rien ne s’applique.',
    noMic: 'Votre navigateur peut lire à voix haute mais pas écouter — touchez votre réponse.',
    micBlocked: 'Micro bloqué — autorisez-le dans le navigateur, ou touchez votre réponse.',
    repeat: 'Répéter',
  },
};

const FLOW: Record<'en' | 'es' | 'de' | 'fr', FlowCopy> = { en, es, de, fr };

export const getFlowCopy = (locale: string): FlowCopy =>
  FLOW[(['es', 'de', 'fr'] as const).find((code) => locale.startsWith(code)) ?? 'en'];
