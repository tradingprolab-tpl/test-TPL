/* TPL · ¿Qué tipo de trader eres? — datos + motor (sin dependencias, sin UI).
   Códigos de opción (texto separado por espacios):
   F V E A P R G C + dígito 0-3 → puntos al arquetipo (F Francotirador, V Velocista, E Estratega,
        A Analista Eterno, P Apostador, R Vengador, G Prisionero del Gráfico, C Constructor)
   sc dt sw po + dígito → afinidad con estilo (scalping, day trading, swing, position)
   rN → señal de ruptura de reglas (0-3) · kN → nivel de consistencia del par (3 = respeta el plan)
   !tm tiempo mínimo · !sn no tolera noche abierta · !ss no puede supervisar sesión · !hi horario irregular
   Preguntas con el mismo código en la 1.ª posición ('lim','esp','seg','stp','frc') forman un par de consistencia. */
(function (root) {
  const AR = ['F', 'V', 'E', 'A', 'P', 'R', 'G', 'C'], ST = ['sc', 'dt', 'sw', 'po'];

  const CFG = {
    url: '',            // URL pública del test (ej. https://usuario.github.io/repo/). Vacío = usa la URL actual.
    tie: 5,             // diferencia mínima (pts) entre 1.º y 2.º arquetipo; menos = perfil mixto
    cMed: 35, cHigh: 50,// umbrales de precaución (impulsividad, revancha, sobreoperación, reglas)
    riskMin: 40,        // Apostador/Vengador solo son principales con evidencia clara (≥40)
    minV: 35,           // compatibilidad mínima para recomendar un estilo
    altM: 10,           // si el 2.º estilo está a ≤10 pts, se muestra como alternativa
    flag: { tm: { sc: .3, dt: .5 }, sn: { sw: .4, po: .3 }, ss: { sc: .4, dt: .7 }, hi: { sc: .5, dt: .75 } }
  };

  const RAW = [
    ['', 'tu tiempo disponible', 'En un día normal, ¿cuánto tiempo real puedes dedicarle al mercado sin que se te cruce nada?', [
      ['15–30 minutos, en ratos sueltos', 'C1 F1 sw3 po2 !tm'], ['Una o dos horas, casi a la misma hora', 'E1 F1 dt2 sw2'],
      ['Un bloque de 3 a 5 horas bien definido', 'E1 V1 dt3 sc1'], ['Casi toda la jornada, pegado a la pantalla', 'G2 V1 sc2 dt2']]],
    ['lim', 'tus límites de pérdida', 'Tocaste tu límite de pérdida diaria y ves una entrada que te gusta. ¿Qué haces?', [
      ['Entro con menos tamaño que de costumbre', 'P1 R1 r2 k1'], ['Apago todo: el límite es el límite', 'E1 C2 F1 k3'],
      ['Entro: es buena para recuperar', 'R3 P1 r3 k0'], ['La anoto y la reviso mañana con calma', 'E2 C1 k3']]],
    ['', 'la duración de tus operaciones', '¿Cuánto dura una operación típica que se sienta natural para ti?', [
      ['Días, dejando que se desarrolle', 'F2 E1 sw3 dt1 po1'], ['Segundos o pocos minutos', 'V3 G1 sc3 dt1'],
      ['Semanas o meses, siguiendo una tendencia', 'C3 F1 po3 sw1'], ['Unas horas, cerrada dentro de la sesión', 'V1 E1 dt3 sc1']]],
    ['esp', 'tu paciencia', 'Llevas toda la mañana sin ver ningún setup tuyo. ¿Qué haces?', [
      ['Bajo un poco mis condiciones para no quedarme sin operar', 'P2 G1 k0'], ['Espero tranquilo: si no hay setup, hoy no opero', 'F3 E1 C1 k3'],
      ['Cambio de activo o de temporalidad a ver si sale algo', 'G2 V1 k1'], ['Me despego de la pantalla y vuelvo en un rato', 'C1 F1 E1 k2']]],
    ['', 'tu plan previo', 'Antes de abrir una operación, ¿qué tan definido tienes el plan?', [
      ['Escrito: entrada, stop, objetivo y escenario alterno', 'E3 C1'], ['Tengo la entrada; lo demás lo decido sobre la marcha', 'P2 V1 r2'],
      ['Claro en mi cabeza, casi nunca lo escribo', 'E1 F1 r1'], ['Busco más confirmaciones y el plan se me alarga', 'A3 r1']]],
    ['', 'lo que más disfrutas', '¿Qué es lo que más disfrutas de operar?', [
      ['La adrenalina de ver cómo se mueve la operación', 'P3 V1'], ['Cazar la operación clara que vale la pena esperar', 'F3 E1'],
      ['Entender por qué se mueve el mercado', 'A3 E1'], ['Estar encima del mercado, siempre pendiente', 'G3 V1'],
      ['Mejorar poco a poco, semana tras semana', 'C3 E1']]],
    ['', 'la regularidad de tu horario', '¿Qué tan regular es tu horario para operar?', [
      ['Muy irregular: opero cuando se puede', 'sw2 po2 !hi'], ['Tengo una ventana fija casi todos los días', 'E1 dt3 sc1'],
      ['Cambia, pero casi siempre encuentro un espacio', 'dt1 sw2'], ['Soy flexible: lo organizo según haga falta', 'G1 dt2 sc1 sw1']]],
    ['seg', 'tus entradas', 'El precio arranca con fuerza como lo habías pensado, pero aún no entraste. ¿Qué haces?', [
      ['Reviso rápido si cumple mis reglas y, si cumple, entro', 'V2 E1 k2'], ['Entro ya: no quiero dejarlo ir', 'P3 V1 r2 k0'],
      ['Espero que retroceda; si no vuelve, lo dejo pasar', 'F3 E1 k3'], ['Reviso más gráficos para confirmar y casi siempre llego tarde', 'A3 k3']]],
    ['', 'tu frecuencia ideal', '¿Cuántas entradas te gusta tomar por semana?', [
      ['Pocas, pero muy pensadas', 'F3 E1 sw3 dt1'], ['Una o dos al día si el mercado da algo claro', 'V1 E1 dt3'],
      ['Muchas: varias veces casi todos los días', 'V2 G2 P1 sc3 dt2'], ['Muy pocas al mes', 'C2 F2 po3 sw1']]],
    ['stp', 'tu stop', 'El precio se acerca a tu stop y sientes que podría rebotar. ¿Qué sueles hacer?', [
      ['Lo quito y dejo que el mercado decida', 'P2 R2 r3 k0'], ['Lo dejo donde está: lo puse con una razón', 'E1 C2 F1 k3'],
      ['Cierro antes por miedo a que siga cayendo', 'A1 V1 r1 k2'], ['Lo alejo un poco para que no me saquen antes del rebote', 'P1 R1 A1 r2 k1']]],
    ['', 'tus rachas ganadoras', 'Encadenas varias operaciones ganadoras. ¿Cambia tu forma de operar?', [
      ['Subo el tamaño: es momento de aprovechar', 'P3 r3'], ['Igual que siempre, sigo mi plan', 'E2 C2 F1'],
      ['Me vuelvo más selectivo para no devolver lo ganado', 'F2 A1 C1'], ['Opero más seguido: estoy en racha', 'G3 P1 V1 r2']]],
    ['', 'tus noches con operaciones abiertas', 'Una operación sigue abierta cuando te vas a dormir. ¿Cómo te sientes?', [
      ['Prefiero no hacerlo: no poder reaccionar me inquieta', 'V1 dt3 sc2 !sn'], ['Tranquilo: tengo stop y duermo bien', 'C1 F1 sw3 po2'],
      ['Depende del riesgo: poco sí, mucho no', 'sw2 dt1 po1'], ['Puedo, pero reviso el celular varias veces', 'G1 A1 sw1 dt1']]],
    ['frc', 'tu máximo de operaciones', '¿Con qué frecuencia respetas el máximo de operaciones que te pusiste para el día?', [
      ['Casi nunca', 'G3 P1 r2 k0'], ['A veces', 'G1 P1 k1'], ['Muchas veces', 'k2'], ['Casi siempre', 'E1 C1 F1 k3'],
      ['No tengo un máximo definido', 'G1 P1 r2 k1']]],
    ['', 'tu rapidez para decidir', 'Aparece una posible entrada. ¿Cuánto tardas en decidir?', [
      ['Segundos: si la veo, la tomo', 'V2 P2 r1 sc3 dt1'], ['Un par de minutos revisando mis condiciones', 'E2 V1 dt3 sc1'],
      ['Bastante: varias temporalidades, indicadores y noticias', 'A3 E1 sw2 po1'], ['Con calma, a veces horas o hasta el día siguiente', 'C2 F1 sw3 po2']]],
    ['', 'tu reacción a una pérdida', 'Acabas de cerrar una pérdida. ¿Cuál es tu primer pensamiento?', [
      ['La siguiente operación ya está en mi cabeza', 'G2 V1'], ['Reviso si seguí mi plan', 'E2 C2 A1'],
      ['No me puedo ir así: tengo que recuperarlo hoy', 'R3 P1 r3'], ['Me enojo y necesito alejarme un rato', 'C1 F1 A1']]],
    ['', 'tus interrupciones', 'Cuando operas, ¿qué tan seguido te interrumpen?', [
      ['Con frecuencia: me cuesta mantener la atención', 'sw3 po2 !ss'], ['Casi nunca: tengo ese tiempo protegido', 'E1 dt2 sc2'],
      ['Siempre: solo miro el mercado en pausas cortas', 'sw3 po3 !ss'], ['A veces, pero retomo sin problema', 'dt2 sw2']]],
    ['', 'tus revisiones fuera de horario', 'Fuera de tus horas de operar, ¿qué tan seguido abres el gráfico «solo para mirar»?', [
      ['Casi nunca', 'C2 F1'], ['Algunas veces a la semana', 'E1'], ['Casi todos los días, varias veces', 'G2 A1'],
      ['Todo el tiempo: no me puedo desconectar', 'G3 P1 r1']]],
    ['', 'tu comodidad con operaciones abiertas', 'Una operación lleva tres días abierta y casi no se ha movido. ¿Cómo te sientes?', [
      ['Me incomoda: prefiero cerrar y buscar algo más activo', 'V2 P1 sc3 dt2'], ['Tranquilo: mientras no invalide mi idea, sigo', 'C2 F2 sw3 po3'],
      ['Impaciente: siento que pierdo el tiempo', 'V2 G1 dt2 sc2'], ['Algo inquieto, pero la respeto', 'E1 A1 sw2 dt1']]],
    ['', 'tu registro de operaciones', '¿Llevas registro de tus operaciones (bitácora, capturas, hoja)?', [
      ['Solo miro los resultados en la plataforma', 'G1 P1 r1'], ['De todas, y lo reviso cada semana', 'C3 E2'],
      ['No: me da pereza o creo que no hace falta', 'P2 R1 r2'], ['De algunas, cuando me acuerdo', 'E1']]],
    ['lim', 'tus límites tras una mala operación', 'Tuviste una mala operación hace un rato y aparece una oportunidad tentadora fuera de tu plan. ¿Qué haces?', [
      ['La tomo con menos tamaño para «cubrirme»', 'P1 R2 r2 k1'], ['La dejo pasar y sigo con mi plan', 'E2 F1 C1 k3'],
      ['La tomo: esta me devuelve lo perdido', 'R3 P1 r3 k0'], ['Espero; si sigue ahí y cumple mis reglas, la valoro', 'F1 A1 E1 k2']]],
    ['', 'tu horizonte de resultados', '¿Cuándo necesitas ver resultados para sentir que vale la pena?', [
      ['En meses: lo que cuenta es la curva larga', 'C3 F1 po3 sw1'], ['El mismo día', 'V2 R1 P1 sc3 dt2'],
      ['En unas semanas: confío en el proceso', 'C2 F1 sw3 po1'], ['Dentro de la semana', 'E1 dt2 sw2']]],
    ['esp', 'tus semanas lentas', 'Esta semana el mercado estuvo lateral y solo hubo una oportunidad válida. ¿Cómo te cae?', [
      ['Opero igual: no puedo pasar una semana sin entrar', 'P2 G2 r2 k0'], ['Bien: esperar también es trabajo', 'F3 C1 k3'],
      ['Me aburro y busco algo en otros activos', 'G2 V1 k1'], ['Aprovecho para revisar y mejorar mi plan', 'E2 C1 A1 k3']]],
    ['', 'tu capacidad de atención', '¿Cuánto tiempo seguido puedes mirar gráficos con la atención puesta en las decisiones?', [
      ['Puedo estar muchas horas, aunque al final decido peor', 'G3 r1 dt1 sc1'], ['10–20 minutos y me disperso', 'sw3 po2 !ss'],
      ['Una o dos horas con buena concentración', 'E1 dt3 sw1'], ['Tres horas o más sin problema', 'G1 V1 sc2 dt3']]],
    ['', 'tu riesgo por operación', '¿Cómo defines cuánto arriesgar en una operación?', [
      ['Un porcentaje fijo de mi cuenta, siempre', 'E2 C2'], ['No lo calculo: abro con el tamaño que «se sienta bien»', 'P3 r3'],
      ['Según cómo vengo en el día: si voy mal o bien, lo subo', 'R2 P2 r3'], ['Lo ajusto según la confianza que tenga en el setup', 'P1 V1 r1']]],
    ['seg', 'tus condiciones de entrada', 'Tu setup cumple 4 de 5 condiciones, la quinta es dudosa y el precio ya se mueve. ¿Qué haces?', [
      ['Espero a que se complete; si no, no entro', 'F3 E1 k3'], ['Entro igual: casi cumple', 'P3 V1 r3 k0'],
      ['Entro con menos tamaño para no quedarme fuera', 'P1 V1 G1 r2 k1'], ['Repaso las condiciones y busco otra señal; casi siempre se me escapa', 'A3 E1 k3']]],
    ['', 'tus días en rojo', 'Cierras el día en rojo y aún queda mercado abierto. ¿Qué haces?', [
      ['Opero unas más para cerrar el día en verde', 'R3 P1 r3'], ['Cierro la plataforma y salgo a despejarme', 'C1 E1 F1'],
      ['Sigo mirando por si aparece algo que arregle el día', 'G2 R2 r2'], ['Anoto qué hice mal y qué cambiar', 'E2 C2 A1']]],
    ['', 'lo que más te frustra', '¿Qué te frustra más?', [
      ['Que me saquen por ruido cuando la idea era buena', 'F1 C1 sw3 po2'], ['Perderme un movimiento grande por no entrar', 'P2 V2 G1 sc2 dt2'],
      ['Cerrar antes de tiempo y ver que siguió a mi favor', 'C2 A1 sw2 po2'], ['Entrar y que avance muy lento', 'V2 G1 sc2 dt2']]],
    ['frc', 'tus excesos de operaciones', 'En el último mes, ¿cuántos días abriste más operaciones de las que habías planeado?', [
      ['Casi todos los días', 'G3 P1 r2 k0'], ['Muchos días', 'G2 P1 r1 k1'], ['Algunos días', 'V1 k2'], ['Casi ninguno', 'E1 C1 F1 k3']]],
    ['stp', 'tus stops recientes', 'En las últimas semanas, ¿moviste o quitaste un stop después de abrir la operación?', [
      ['Sí, varias veces lo quité por completo', 'P2 R2 r3 k0'], ['No: lo dejo tal como lo puse', 'E1 C2 F1 k3'],
      ['Sí, algunas veces lo alejé para darle espacio', 'P1 R1 A1 r2 k1'], ['Solo para protegerme, acercándolo a mi favor', 'E1 C1 k3']]],
    ['', 'tus revisiones con operación abierta', 'Con una operación abierta, ¿cuántas veces miras cómo va?', [
      ['Cada pocos minutos', 'G2 V1 sc2 dt2'], ['Casi nunca: trabaja con su stop y su objetivo', 'C2 F2 sw3 po3'],
      ['Sin parar: no puedo despegar la vista', 'G3 P1 sc3 dt1'], ['Unas pocas veces al día', 'E1 sw2 dt2']]]
  ];

  function parse(s) {
    const o = { a: {}, s: {}, r: 0, k: null, f: [] };
    s.split(' ').filter(Boolean).forEach(t => {
      let m;
      if (t[0] === '!') o.f.push(t.slice(1));
      else if (/^[A-Z]\d$/.test(t)) o.a[t[0]] = +t[1];
      else if ((m = t.match(/^(sc|dt|sw|po)(\d)$/))) o.s[m[1]] = +m[2];
      else if (t[0] === 'r') o.r = +t[1];
      else if (t[0] === 'k') o.k = +t[1];
    });
    return o;
  }
  const Q = RAW.map(([c, p, q, o]) => ({ c, p, q, o: o.map(([t, w]) => Object.assign({ t }, parse(w))) }));

  const ARCH = {
    F: { slug: 'francotirador', name: 'El Francotirador', color: '#38BDF8', tag: 'No operas mucho. Operas cuando vale la pena.',
      desc: 'Prefieres mirar, esperar y disparar solo cuando todo se alinea. Un día sin operar no te angustia; te angustia entrar en algo mediocre.',
      fort: 'No necesitas operar todo el tiempo para sentirte bien.', deb: 'Esperar tanto que te vuelvas rígido o te frustres cuando hay pocas oportunidades.',
      vig: 'Que «esperar el setup perfecto» se convierta en no tomar nunca ninguno.' },
    V: { slug: 'velocista', name: 'El Velocista', color: '#FACC15', tag: 'Piensas rápido. A veces, más rápido que el gráfico.',
      desc: 'Decides ágil y te sientes cómodo cuando el mercado se acelera. Tu reto no es la velocidad: es no confundirla con calidad.',
      fort: 'Agilidad para procesar información y decidir en entornos dinámicos.', deb: 'Entrar antes de confirmar y sobreoperar por sentirte «en ritmo».',
      vig: 'Contar cuántas entradas hiciste antes de contar cuántas cumplían tu plan.' },
    E: { slug: 'estratega', name: 'El Estratega', color: '#A78BFA', tag: 'Si no está en el plan, no existe.',
      desc: 'Antes de actuar ya pensaste en el escenario A, el B y qué harás si falla. Operas con mapa, no con corazonadas.',
      fort: 'Planificación y pensamiento estructurado.', deb: 'Querer controlar todos los escenarios y complicar el plan de más.',
      vig: 'Reglas que se multiplican hasta que ya no puedes ejecutarlas.' },
    A: { slug: 'analista-eterno', name: 'El Analista Eterno', color: '#94A3B8', tag: 'Una confirmación más… y ya se fue.',
      desc: 'Te encanta entender el contexto y por eso estudias todo. Pero a veces el análisis se vuelve una forma elegante de no decidir.',
      fort: 'Curiosidad real por comprender el mercado y estudiar.', deb: 'Parálisis por análisis: entrar tarde o usar el análisis para evitar la incertidumbre.',
      vig: 'Ponerte un tiempo máximo de análisis y un máximo de condiciones antes de entrar. Cambiar de estilo no arregla la indecisión por sí solo.' },
    P: { slug: 'apostador', name: 'El Apostador', color: '#F472B6', tag: 'El mercado se mueve y tú ya estás dentro.',
      desc: 'Te mueve la energía del momento y te cuesta ver pasar un movimiento. Esa intensidad es tu motor, pero necesita límites que la encaucen.',
      fort: 'Entusiasmo y energía (aún no es una ventaja de ejecución, pero es combustible).', deb: 'Exposición impulsiva, saltarte confirmaciones y operar sin plan.',
      vig: 'Cualquier entrada que no puedas explicar en una frase antes de abrirla.',
      pn: 'Prioriza control de riesgo, reglas escritas y práctica en simulación hasta demostrar consistencia.' },
    R: { slug: 'vengador', name: 'El Vengador', color: '#EF4444', tag: 'Una pérdida no se acepta: se cobra.',
      desc: 'Una pérdida te activa y sientes urgencia por corregirla. Esa intensidad puede convertirse en aprendizaje… o en la siguiente pérdida.',
      fort: 'Tus ganas de corregir errores pueden ser un motor de mejora si las conviertes en revisión y no en revancha.', deb: 'Subir tamaño, romper límites o seguir operando con rabia tras perder.',
      vig: 'Las dos operaciones que siguen a una pérdida.',
      pn: 'Prioriza un protocolo post-pérdida (pausa obligatoria, límite diario y máximo de operaciones tras perder). Ningún estilo, por sí solo, resuelve la revancha.' },
    G: { slug: 'prisionero-del-grafico', name: 'El Prisionero del Gráfico', color: '#A3E635', tag: 'Si el mercado está abierto, tú también.',
      desc: 'Estás muy presente: miras, revisas, vuelves a mirar. Ese compromiso es valioso, pero más tiempo de pantalla no es más progreso.',
      fort: 'Compromiso y atención enormes cuando se estructuran.', deb: 'Sobreoperar y confundir tiempo de pantalla con progreso.',
      vig: 'El número de entradas por día y las horas frente a la pantalla.',
      pn: 'Define ventanas de operación y un máximo de entradas por día; la pantalla no es el plan.' },
    C: { slug: 'constructor', name: 'El Constructor', color: '#2DD4BF', tag: 'No buscas ganar hoy: buscas seguir en el juego mañana.',
      desc: 'Piensas en meses, no en minutos. Prefieres proteger tu capital y mejorar tu proceso antes que perseguir resultados rápidos.',
      fort: 'Constancia, paciencia y visión de proceso.', deb: 'Avanzar demasiado despacio o confundir paciencia con no corregir.',
      vig: 'Revisar tus resultados con frecuencia, aunque duela lo que digan.' }
  };

  const STY = {
    sc: { name: 'Scalping', color: '#E879F9', def: 'Operaciones de segundos o minutos.',
      ten: 'Exige concentración intensa, ejecución precisa, costes de transacción controlados y supervisión constante.',
      cond: 'Una estrategia validada con datos y disciplina demostrada, primero en simulación.' },
    dt: { name: 'Day trading', color: '#FB923C', def: 'Operaciones que se abren y cierran dentro de la misma sesión.',
      ten: 'Necesitas bloques horarios definidos y poder seguir tu plan durante la sesión. Más tiempo de pantalla no equivale a mejores resultados.',
      cond: 'Comprobar que tu estrategia funciona dentro de tu horario y que puedes respetar tu límite de operaciones y de pérdida.' },
    sw: { name: 'Swing trading', color: '#60A5FA', def: 'Operaciones mantenidas durante días o algunas semanas.',
      ten: 'Debes planificar entradas, stops y riesgo overnight. No significa menos riesgo ni ganancias superiores.',
      cond: 'Una estrategia probada en este horizonte y poder sostener posiciones abiertas sin tocar el plan.' },
    po: { name: 'Position trading', color: '#34D399', def: 'Operaciones de semanas o meses (no es lo mismo que invertir a largo plazo).',
      ten: 'Baja frecuencia, movimientos prolongados en contra y mucha paciencia con el capital expuesto.',
      cond: 'Que tu estrategia, tu capital y tu tolerancia a posiciones abiertas sean compatibles, validado con datos.' }
  };

  const mx = (keys, f) => { const m = {}; keys.forEach(k => m[k] = Q.reduce((s, q) => s + Math.max(...q.o.map(o => f(o, k))), 0)); return m; };
  const MA = mx(AR, (o, k) => o.a[k] || 0), MS = mx(ST, (o, k) => o.s[k] || 0);
  const MR = Q.reduce((s, q) => s + Math.max(...q.o.map(o => o.r)), 0);

  // ans: array de índices de opción (null = sin responder). Devuelve el resultado completo y auditable.
  function compute(ans) {
    const ra = {}, rs = {}, ks = {}, fl = new Set(); let rr = 0;
    AR.forEach(k => ra[k] = 0); ST.forEach(k => rs[k] = 0);
    Q.forEach((q, i) => {
      const o = q.o[ans[i]]; if (!o) return;
      AR.forEach(k => ra[k] += o.a[k] || 0); ST.forEach(k => rs[k] += o.s[k] || 0);
      rr += o.r; o.f.forEach(f => fl.add(f)); if (q.c) (ks[q.c] = ks[q.c] || []).push(o.k);
    });
    // Motor A · arquetipo (0-100 por rasgo; desempate: puntos brutos y luego orden fijo)
    const pa = {}; AR.forEach(k => pa[k] = Math.round(100 * ra[k] / MA[k]));
    const rank = AR.slice().sort((x, y) => pa[y] - pa[x] || ra[y] - ra[x] || AR.indexOf(x) - AR.indexOf(y));
    const cands = rank.filter(k => !('PR'.includes(k) && pa[k] < CFG.riskMin));
    const top = cands[0], second = cands[1], mixed = pa[top] - pa[second] < CFG.tie;
    // Señales de precaución
    const rules = Math.round(100 * rr / MR), sig = [pa.P, pa.R, pa.G, rules];
    const caution = sig.some(v => v >= CFG.cHigh) || sig.filter(v => v >= CFG.cMed).length >= 2 ? 'alta' : sig.some(v => v >= CFG.cMed) ? 'media' : 'baja';
    // Consistencia: pares que miden lo mismo; difieren ≥2 niveles = tendencia distinta según la situación
    const pairs = Object.values(ks).filter(a => a.length === 2), inc = pairs.filter(a => Math.abs(a[0] - a[1]) >= 2).length;
    let conf = inc === 0 ? 'alta' : inc === 1 ? 'media' : 'baja';
    if (mixed && conf === 'alta') conf = 'media';
    // Motor B · estilos (independiente del arquetipo: disponibilidad, ritmo y horizonte; flags = restricciones)
    const adj = {};
    ST.forEach(s => { let v = 100 * rs[s] / MS[s]; fl.forEach(f => { const m = (CFG.flag[f] || {})[s]; if (m) v *= m; }); adj[s] = Math.round(v); });
    const process = caution === 'alta' || top === 'P' || top === 'R';
    const gate = !['tm', 'ss', 'hi'].some(f => fl.has(f)) && caution === 'baja' && conf !== 'baja' && adj.sc >= adj.dt + 10;
    const cand = ST.filter(s => s !== 'sc' || (gate && !process)).map(s => [s, adj[s] * (process && s === 'dt' ? .8 : 1)]).sort((a, b) => b[1] - a[1]);
    const best = cand[0], alt = cand[1];
    const sid = best[1] >= CFG.minV ? best[0] : null;
    const altId = sid && alt[1] >= CFG.minV && best[1] - alt[1] <= CFG.altM ? alt[0] : null;
    const reasons = [];
    if (sid) Q.map((q, i) => [q.o[ans[i]], q]).filter(([o]) => o && (o.s[sid] || 0) >= 2)
      .sort((x, y) => y[0].s[sid] - x[0].s[sid]).slice(0, 3).forEach(([o, q]) => reasons.push({ topic: q.p, text: o.t }));
    const fast = !sid ? false : (adj.sc >= adj.dt || sid === 'dt') && !gate;
    return { pa, rank, top, second, mixed, caution, rules, inc, conf, adj, flags: [...fl], process,
      style: sid, alt: altId, reasons, scNote: fast && (adj.sc >= adj.dt),
      compat: sid ? (adj[sid] >= 65 ? 'alta' : adj[sid] >= 45 ? 'media' : 'baja') : null };
  }

  const api = { Q, ARCH, STY, AR, ST, CFG, compute };
  if (typeof module === 'object' && module.exports) module.exports = api; else root.TPL = api;
})(typeof self !== 'undefined' ? self : globalThis);
