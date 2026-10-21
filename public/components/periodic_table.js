/* GRID_SOUL_PERIODIC_TABLE_V1
 * Catálogo de 118 elementos e posições da tabela periódica.
 * Módulo independente: ainda não altera o motor 3D.
 */
export const GRID_SOUL_ELEMENTS = [
[1,"H","Hidrogênio",1,1,1],[2,"He","Hélio",1,18,4],
[3,"Li","Lítio",2,1,7],[4,"Be","Berílio",2,2,9],
[5,"B","Boro",2,13,11],[6,"C","Carbono",2,14,12],
[7,"N","Nitrogênio",2,15,14],[8,"O","Oxigênio",2,16,16],
[9,"F","Flúor",2,17,19],[10,"Ne","Neônio",2,18,20],
[11,"Na","Sódio",3,1,23],[12,"Mg","Magnésio",3,2,24],
[13,"Al","Alumínio",3,13,27],[14,"Si","Silício",3,14,28],
[15,"P","Fósforo",3,15,31],[16,"S","Enxofre",3,16,32],
[17,"Cl","Cloro",3,17,35],[18,"Ar","Argônio",3,18,40],
[19,"K","Potássio",4,1,39],[20,"Ca","Cálcio",4,2,40],
[21,"Sc","Escândio",4,3,45],[22,"Ti","Titânio",4,4,48],
[23,"V","Vanádio",4,5,51],[24,"Cr","Cromo",4,6,52],
[25,"Mn","Manganês",4,7,55],[26,"Fe","Ferro",4,8,56],
[27,"Co","Cobalto",4,9,59],[28,"Ni","Níquel",4,10,59],
[29,"Cu","Cobre",4,11,64],[30,"Zn","Zinco",4,12,65],
[31,"Ga","Gálio",4,13,70],[32,"Ge","Germânio",4,14,73],
[33,"As","Arsênio",4,15,75],[34,"Se","Selênio",4,16,79],
[35,"Br","Bromo",4,17,80],[36,"Kr","Criptônio",4,18,84],
[37,"Rb","Rubídio",5,1,85],[38,"Sr","Estrôncio",5,2,88],
[39,"Y","Ítrio",5,3,89],[40,"Zr","Zircônio",5,4,91],
[41,"Nb","Nióbio",5,5,93],[42,"Mo","Molibdênio",5,6,96],
[43,"Tc","Tecnécio",5,7,98],[44,"Ru","Rutênio",5,8,101],
[45,"Rh","Ródio",5,9,103],[46,"Pd","Paládio",5,10,106],
[47,"Ag","Prata",5,11,108],[48,"Cd","Cádmio",5,12,112],
[49,"In","Índio",5,13,115],[50,"Sn","Estanho",5,14,119],
[51,"Sb","Antimônio",5,15,122],[52,"Te","Telúrio",5,16,128],
[53,"I","Iodo",5,17,127],[54,"Xe","Xenônio",5,18,131],
[55,"Cs","Césio",6,1,133],[56,"Ba","Bário",6,2,137],
[57,"La","Lantânio",6,3,139],[58,"Ce","Cério",8,4,140],
[59,"Pr","Praseodímio",8,5,141],[60,"Nd","Neodímio",8,6,144],
[61,"Pm","Promécio",8,7,145],[62,"Sm","Samário",8,8,150],
[63,"Eu","Európio",8,9,152],[64,"Gd","Gadolínio",8,10,157],
[65,"Tb","Térbio",8,11,159],[66,"Dy","Disprósio",8,12,163],
[67,"Ho","Hólmio",8,13,165],[68,"Er","Érbio",8,14,167],
[69,"Tm","Túlio",8,15,169],[70,"Yb","Itérbio",8,16,173],
[71,"Lu","Lutécio",8,17,175],[72,"Hf","Háfnio",6,4,178],
[73,"Ta","Tântalo",6,5,181],[74,"W","Tungstênio",6,6,184],
[75,"Re","Rênio",6,7,186],[76,"Os","Ósmio",6,8,190],
[77,"Ir","Irídio",6,9,192],[78,"Pt","Platina",6,10,195],
[79,"Au","Ouro",6,11,197],[80,"Hg","Mercúrio",6,12,201],
[81,"Tl","Tálio",6,13,204],[82,"Pb","Chumbo",6,14,207],
[83,"Bi","Bismuto",6,15,209],[84,"Po","Polônio",6,16,209],
[85,"At","Astato",6,17,210],[86,"Rn","Radônio",6,18,222],
[87,"Fr","Frâncio",7,1,223],[88,"Ra","Rádio",7,2,226],
[89,"Ac","Actínio",7,3,227],[90,"Th","Tório",9,4,232],
[91,"Pa","Protactínio",9,5,231],[92,"U","Urânio",9,6,238],
[93,"Np","Netúnio",9,7,237],[94,"Pu","Plutônio",9,8,244],
[95,"Am","Amerício",9,9,243],[96,"Cm","Cúrio",9,10,247],
[97,"Bk","Berquélio",9,11,247],[98,"Cf","Califórnio",9,12,251],
[99,"Es","Einstênio",9,13,252],[100,"Fm","Férmio",9,14,257],
[101,"Md","Mendelévio",9,15,258],[102,"No","Nobélio",9,16,259],
[103,"Lr","Laurêncio",9,17,266],[104,"Rf","Rutherfórdio",7,4,267],
[105,"Db","Dúbnio",7,5,268],[106,"Sg","Seabórgio",7,6,269],
[107,"Bh","Bóhrio",7,7,270],[108,"Hs","Hássio",7,8,277],
[109,"Mt","Meitnério",7,9,278],[110,"Ds","Darmstádtio",7,10,281],
[111,"Rg","Roentgênio",7,11,282],[112,"Cn","Copernício",7,12,285],
[113,"Nh","Nihônio",7,13,286],[114,"Fl","Fleróvio",7,14,289],
[115,"Mc","Moscóvio",7,15,290],[116,"Lv","Livermório",7,16,293],
[117,"Ts","Tenessino",7,17,294],[118,"Og","Oganessônio",7,18,294]
].map(([z,symbol,name,period,group,mass]) =>
  Object.freeze({z,symbol,name,period,group,mass})
);

export function gridSoulElementBySymbol(symbol) {
  const normalized = String(symbol || "").trim().toLowerCase();
  return GRID_SOUL_ELEMENTS.find(e => e.symbol.toLowerCase() === normalized) || null;
}

export function gridSoulElementAt(period, group) {
  return GRID_SOUL_ELEMENTS.find(e => e.period === period && e.group === group) || null;
}
