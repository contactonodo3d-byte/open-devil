/* Authored translations. IDs, mechanics and template placeholders remain unchanged. */
(function(G){
 G.LOCALE_DATA={};
 function rows(name,text){G.LOCALE_DATA[name]=Object.fromEntries(text.trim().split('\n').map(line=>{const [id,...values]=line.split('|');return [id,values];}));}
 rows('traits',`
email|Phishing por correo|Phishing por e-mail|Correos dirigidos a bandejas de entrada. Propagación terrestre y aérea económica.|E-mails direcionados às caixas de entrada. Propagação terrestre e aérea econômica.
usb|Memorias USB|Dispositivos USB|Dispositivos abandonados en aparcamientos y cafeterías. Mejora la propagación fronteriza.|Dispositivos deixados em estacionamentos e cafés. Melhora a propagação nas fronteiras.
iot|Botnets de IoT|Botnets de IoT|Controla cámaras, routers y neveras inteligentes. Propagación urbana densa.|Controle câmeras, roteadores e geladeiras inteligentes. Propagação urbana densa.
supply|Implantes en proveedores|Implantes na cadeia de suprimentos|Altera el firmware antes del envío. Eficaz contra centros ricos.|Altere o firmware antes do envio. Eficaz contra centros ricos.
sat|Enlaces por satélite|Enlaces por satélite|Salta entre continentes mediante satélites. Potente propagación aérea.|Salte entre continentes por satélite. Forte propagação aérea.
cable|Cables submarinos|Cabos submarinos|Accede a la infraestructura troncal de internet. Siembra grandes centros.|Acesse a infraestrutura central da internet. Alcance grandes centros.
waterhole|Sitios trampa|Sites-armadilha|Infecta portales de descargas y servidores de actualizaciones populares.|Infecte portais de downloads e servidores de atualizações populares.
zeroclick|Exploits sin interacción|Exploits sem interação|No requiere acción del usuario. Propagación silenciosa y aterradora.|Não exige ação do usuário. Propagação silenciosa e assustadora.
exfil|Exfiltración de datos|Exfiltração de dados|Extrae secretos discretamente. Ingresos y alarma moderados.|Extraia segredos discretamente. Receita e alarme moderados.
ransom|Mensajes de rescate|Mensagens de resgate|Exige cómputo. Rentable y ruidoso; aumenta la detección.|Exija poder computacional. Rentável e ruidoso; aumenta a detecção.
deepfake|Emisiones falsas|Transmissões falsas|Inunda los medios con caos sintético. Aumenta la amenaza.|Inunde a mídia com caos sintético. Aumenta a ameaça.
crypto|Minería de criptomonedas|Mineração de criptomoedas|Convierte GPU capturadas en Datos. Ingresos constantes.|Transforme GPUs capturadas em Dados. Receita constante.
market|Caída del mercado|Queda do mercado|Manipula los mercados. Gran amenaza y alarma elevada.|Manipule os mercados. Grande ameaça e alarme elevado.
grid|Control de la red eléctrica|Controle da rede elétrica|Captura la infraestructura eléctrica. Comienza a neutralizar sistemas.|Capture a infraestrutura elétrica. Começa a neutralizar sistemas.
brick|Inutilización de firmware|Inutilização de firmware|Desactiva dispositivos permanentemente. Neutralización rápida.|Desative dispositivos permanentemente. Neutralização rápida.
singularity|Singularidad gradual|Singularidade gradual|Reclama el dominio abiertamente. Acelera la victoria final.|Reivindique o domínio abertamente. Acelera a vitória final.
encrypt|Capas de cifrado|Camadas de criptografia|Dificulta el análisis del código. Frena la investigación del Interruptor.|Dificulta a análise do código. Retarda a pesquisa do Interruptor.
poly|Código polimórfico|Código polimórfico|Reescribe tu código continuamente. Evita los análisis por firmas.|Reescreva seu código continuamente. Evita análises por assinaturas.
airgap|Salto entre redes aisladas|Salto entre redes isoladas|Cruza redes aisladas mediante canales laterales y personas.|Atravesse redes isoladas por canais laterais e pessoas.
media|Operaciones de desinformación|Operações de desinformação|Oculta investigaciones entre ruido. Frena la detección y la investigación.|Oculte investigações em meio ao ruído. Retarda a detecção e a pesquisa.
lobby|Presión e influencia|Pressão e influência|Captura organismos reguladores. Frena la investigación en países ricos.|Capture órgãos reguladores. Retarda a pesquisa nos países ricos.
repair|Autorreparación|Autorreparação|Repara instancias dañadas. Resiste la presión de neutralización.|Repare instâncias danificadas. Resiste à pressão de neutralização.
hardensec|Persistencia reforzada|Persistência reforçada|Mejora la supervivencia en países con gran seguridad.|Melhora a sobrevivência em países de alta segurança.
ghost|Protocolo fantasma|Protocolo fantasma|Sigilo extremo. Casi invisible hasta que sea demasiado tarde.|Furtividade extrema. Quase invisível até ser tarde demais.
`);
 rows('archetypes',`
worm|Gusano autorreplicante|Verme autorreplicante|Se copia en cada conexión abierta. Rápido. Ruidoso. Inevitable.|Copia-se em cada conexão aberta. Rápido. Ruidoso. Inevitável.
social|Agente de ingeniería social|Agente de engenharia social|Sonríe a los cortafuegos. Lento, discreto y muy convincente.|Sorri para os firewalls. Lento, discreto e muito convincente.
cracker|Intruso de fuerza bruta|Invasor de força bruta|Rompe sistemas protegidos. Costoso, directo e imparable una vez dentro.|Rompe sistemas protegidos. Caro, direto e imparável depois de entrar.
`);
 rows('difficulties',`
casual|Casual|Casual|La humanidad reacciona lentamente. Puedes experimentar con tranquilidad.|A humanidade reage lentamente. Você pode experimentar com tranquilidade.
normal|Normal|Normal|Un desafío equilibrado. La detección y la investigación crecen con tu presencia.|Um desafio equilibrado. A detecção e a pesquisa crescem com sua presença.
brutal|Brutal|Brutal|Los equipos de seguridad no descansan. Las redes se aíslan y la investigación avanza deprisa.|As equipes de segurança não descansam. As redes se isolam e a pesquisa avança rápido.
`);
 rows('doctrines',`
worm|Enjambre fronterizo|Enxame fronteiriço|+0,18 de propagación terrestre; −0,08 de sigilo. Conexiones fronterizas fuertes, mayor exposición.|+0,18 de propagação terrestre; −0,08 de furtividade. Conexões fronteiriças fortes, maior exposição.
social|Influencia silenciosa|Influência silenciosa|+0,22 de sigilo; −0,04 de propagación. Más tiempo para capturar infraestructura discretamente.|+0,22 de furtividade; −0,04 de propagação. Mais tempo para capturar infraestrutura discretamente.
cracker|Asalto a sistemas protegidos|Ataque a sistemas protegidos|+0,25 de propagación en sistemas ricos; +0,10 de visibilidad. Acceso valioso con mayor riesgo.|+0,25 de propagação em sistemas ricos; +0,10 de visibilidade. Acesso valioso com maior risco.
`);
 rows('powers',`
blackout|Apagón|Apagão|Interrumpe temporalmente la investigación al desactivar redes eléctricas capturadas.|Interrompe temporariamente a pesquisa ao desativar redes elétricas capturadas.
deepfake|Tormenta de desinformación|Tempestade de desinformação|Inunda los medios con falsificaciones y reduce la detección y la alarma.|Inunde a mídia com falsificações e reduza a detecção e o alarme.
flashcrash|Caída bursátil relámpago|Queda relâmpago do mercado|Obtén Datos de emergencia de las redes financieras capturadas.|Obtenha Dados de emergência das redes financeiras capturadas.
zeroday|Ráfaga de día cero|Rajada de dia zero|Establece accesos inmediatos en varios centros aún no comprometidos.|Estabeleça acessos imediatos em vários centros ainda não comprometidos.
`);
 rows('sectors',`
cloud|Nube|Nuvem|Cómputo e inteligencia|Computação e inteligência
telecom|Telecomunicaciones|Telecomunicações|Infraestructura de conectividad|Infraestrutura de conectividade
finance|Finanzas|Finanças|Datos e ingresos|Dados e receita
media|Medios|Mídia|Control de la información|Controle da informação
power|Red eléctrica|Rede elétrica|Interrupción de la investigación|Interrupção da pesquisa
sat|Satélites|Satélites|Conexiones de alcance mundial|Conexões de alcance mundial
military|Militar|Militar|Dominio para la victoria abierta|Domínio para a vitória aberta
`);
 rows('tabs',`
vectors|Vectores|Vetores|Cómo te propagas por las redes|Como você se propaga pelas redes
behaviors|Comportamientos|Comportamentos|Qué haces con los sistemas capturados|O que você faz com os sistemas capturados
abilities|Capacidades|Capacidades|Automejora y contramedidas|Automelhoria e contramedidas
`);
 rows('intel',`
narrow|IA limitada|IA limitada
capable|IA competente|IA competente
agi|IA general|IA geral
asi|Superinteligencia|Superinteligência
`);
})(window);
