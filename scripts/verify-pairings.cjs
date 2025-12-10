#!/usr/bin/env node
/**
 * Verify Google Sheet pairings against Convex routes for 12/8/2025
 * Run with: node scripts/verify-pairings.js
 */

const fs = require('fs');

// Sheet data (from Google Sheets MCP fetch)
const SHEET_DATA = [
  ["Rider_FirstNm","Rider_LastNm","PUAM_Drv","PUPM_Drv","WED PM Driver","FRI PM DRIVER","School","NOTES"],
  ["Astrid"," Vargus Lara "," Abdul ","Abdul"," Abdul ","","Davidson Middle School"],
  ["Sophia","Ingoldsby"," Abdul "," NPU "," NPU ","","Artistry Studios"],
  ["Geffen","Moran"," Abdul -  PM Only "," Abdul "," Abdul ","","The Helix School"],
  ["Olivia","Nathanson"," Abdul - Wed Only "," NPU "," Abdul ","","San Domenico to Horse Ranch/ Home"],
  ["Lachlan","Gillard"," Aghanemom "," Aghanemom "," Aghanemom ","","Anova Center"],
  ["Rashaun","Crawford-Green"," Alexandre Carvalo "," Alexandre C "," Alexandre C ","","Oak Hill School"],
  ["Helaina"," Matson "," Alexandre Nery "," Alexandre Nery "," Denis ","","Hill Education Center"],
  ["Rex","Goldstien"," Alexandre Nery "," Alexandre Nery "," Alexandre Nery ","","The Helix School MS"],
  ["Cassidy","Kissane","Amanda"," Amanda ","Amanda","","Archie Williams High School"],
  ["Violet","Bell","Amanda"," Amanda "," Amanda ","","Archie Williams High School"],
  ["Reese","Danziger","Behur PM Only ","Benhur","NPU","","Headlands Prep"],
  ["Alberth"," Lopez Contanza ","Benhur","Benhur"," Benhur ","","Davidson Middle School"],
  ["Moses"," Radar ","Benhur","Benhur"," Benhur ","","San Jose Middle"],
  ["Jesse","Shelley"," Camila "," Teresa "," Teresa ","","Archie Williams High School"],
  ["Mae","Sanford"," Camila "," Camila "," Camila ","","Redwood High School"],
  ["Aubrey"," Sanchez ","Camila PM Only","Camila"," Camila ","","San Andreas High School"],
  ["Hunter","Newton"," Daiane "," Daiane "," Daiane ","","Hamilton School TK - 3rd Grade"],
  ["Will","Sims"," Daniel "," Daniel "," Daniel ","","A Better Chance"],
  ["Daniel"," Lee "," Deborah "," Deborah "," Deborah ","","Hamilton School TK - 8"],
  ["Mara","Rosenblum"," Deborah "," Deborah "," Deborah ","","Hamilton School TK - 8"],
  ["Melanie","Sontay Hernandez"," Deborah "," NPU "," NPU ","","Hamilton School 3rd Grade"],
  ["Hudson","Purdy"," DeMilton "," DeMilton "," DeMilton ","","The Helix School MS"],
  ["Avery","Madrid","Denis C"," Denis C "," Denis C ","","Compass Academy"],
  ["Thomas","Traeger","Denis C"," Denis C "," Denis C ","","Compass Academy"],
  ["Jonathan","Hernandez Gil","Denis C"," Denis C "," Denis C ","","Compass Academy"],
  ["Tyler","Rothwell"," NPU ","NPU","NPU","","Compass Academy"],
  ["Mateo","Sanchez","Denis- PM Only"," Denis C "," Denis C ","","The Helix School 11:30"],
  ["Dylan","Hawkins"," Elias "," Elias "," Elias ","","Irene Hunt"],
  ["Casey \"Caz\"","Schoenhoeft"," Evaldo "," Evaldo "," Evaldo ","","Oak Hill School"],
  ["Jainagil","Moore"," Evaldo "," Evaldo "," Evaldo ","","Lu Sutton"],
  ["Zander","Kirberg"," Evaldo - PM Only "," Evaldo "," Evaldo ","","Marindale Pre School"],
  ["Cashis"," Compton "," Evelyn "," Evelyn "," Evelyn ","","Archie Williams High School"],
  ["Gabriella","Wyllie"," Evelyn "," Evelyn "," Evelyn ","","Archie Williams High School"],
  ["Milo"," Jaffee "," Evelyn "," Evelyn "," Evelyn ","","Archie Williams High School"],
  ["Nicholas","Debisschop"," Evelyn "," Evelyn "," Evelyn ","","Archie Williams High School"],
  ["Ethan","Luke"," Fabianne "," Fabianne "," Fabianne ","","Anova Center"],
  ["Evander","Compton"," Fabianne "," Fabianne "," Fabianne ","","Anova Center"],
  ["Milo","Schaefer"," Fabianne "," Fabianne "," Fabianne ","","Anova Center"],
  ["Ben","Kernon"," Fabiano "," Nayane "," Nayane ","","Star Academy - Post HS"],
  ["Penny"," Delay "," Fatima "," Fatima "," Fatima ","","Bacich Elementary"],
  ["Dominic","Veletzos"," Fernanda C "," Evelyn "," Evelyn ","","Star Academy - Post HS"],
  ["Eloise","Riedel"," Fernanda C "," Evelyn "," Evelyn ","","Star Academy - Post HS"],
  ["Twila"," Stuart "," Fernanda C "," Evelyn "," Evelyn ","","Star Academy - Post HS"],
  ["Eliza","Brown-Lewin"," Fernanda C "," Fernanda C "," Fernanda C ","","Grant Grover"],
  ["Michaela","Giacoppa"," Fernanda C "," Fernanda C "," Fernanda C ","","Grant Grover"],
  ["Brian \"Max\""," Anderson "," Fernanda D "," Fernanda D "," Fernanda D ","","Hanna Academy"],
  ["Jasmin","Banducci-Camona","Gleiceara"," Gleiceara "," Gleiceara ","","Indian Valley College"],
  ["Getty"," Mitchell ","Gui","Gui","Gui","","Oak Hill School"],
  ["Rosalie","Reible","Gui"," NPU "," NPU ","","Grant Grover"],
  ["Rylan","Massey","Gui","Gui","Gui","","Oak Hill School"],
  ["Samantha","Greenstone"," Gustavo "," Gustavo "," Gustavo ","","Orion High School"],
  ["Alek","Park","Hashim","Hashim","Hashim","","Hamilton School TK - 8"],
  ["Xenia"," Botaitas "," Hashim PM Only "," Hashim "," Wed/every other Fri. "," Hashim ","Hall Middle School"],
  ["Tia","Lewis"," Hellia M "," Hellia M "," Hellia M ","","Hamilton School 6th Grade"],
  ["Huxley","Constantino","Joana","Joana","Dennis","","Bel Air Elementary"],
  ["Riely","Rodas","Joana","Joana","","","Indian Valley College"],
  ["Terrance"," Moore "," Joel C "," Joel C "," Joel C ","","Hanna Academy"],
  ["James \"Lincoln\"","Ott","John"," John "," John ","","Lucas Valley Elementary"],
  ["James \"Lincoln\"","Ott","John"," John "," John ","","CCS Trips"],
  ["Josseph","de La Cruz","John"," John "," John ","","Redwood High School"],
  ["Roy"," Ramirez-Preciado ","John"," John "," John ","","Grant Grover"],
  ["Wasley","Gonzalez Hernandez","John"," John "," John ","","Lucas Valley Elementary"],
  ["Yadiel","Maldonado","John"," John "," John ","","Lucas Valley Elementary"],
  ["Amilcar","Sandoval"," Jose Maria "," Jose Maria "," Jose Maria ","","Compass Academy"],
  ["Brandon","Kitterman"," Jose Maria "," Jose Maria "," Jose Maria ","","Compass Academy"],
  ["David","Luna"," Jose Maria "," Jose Maria "," Jose Maria ","","Compass Academy"],
  ["Andrea/Isabel","Gutierrez","Josh"," Josh "," TBD ","","Redwood High School"],
  ["Sam","Glasser","Josh"," Josh "," Josh ","","Tamiscal High School"],
  ["Toby","Sturm","Josh"," Josh "," Josh ","","Tamiscal High School"],
  ["Joey","Mendoza"," Juliana "," Juliana "," Juliana ","","Irene Hunt"],
  ["Pharoah","Viotay"," Juliana "," Juliana "," Juliana ","","Irene Hunt"],
  ["Benjamin \"Zale\"","Mora Russell","Karla"," Karla "," Karla ","","North Valley School"],
  ["Shannon"," Cloney ","Karla PM Only","Karla"," Karla ","","Costco - Work"],
  ["Alex","Gustin","Lessa"," Lessa "," Lessa ","","The Helix School MS"],
  ["Brian","Spooner"," Lidiane "," Lidiane "," Lidiane ","","Compass Academy"],
  ["Makai","Price"," Lidiane "," Lidiane "," Lidiane ","","Compass Academy"],
  ["Edmund \"Neddy\"","Murray"," Ludmila "," Ludmila "," Ludmila ","","Oak Hill School"],
  ["Richardo","Reyes-Vela"," Luiz Correa "," Luiz Correa "," Luiz Correa ","","Compass Academy"],
  ["Isadora","Sihra","Marianna","Marianna","Marianna","","Oak Hill School"],
  ["Rowan","Klein","Mary","Mary","Mary","","Cypress School"],
  ["Carlos","Escudero-Raygoza","Nader"," Nader "," Nader ","","Oak Hill School"],
  ["Isaac"," Rettberg ","Nader"," Nader "," Nader ","","Irene Hunt"],
  ["Mynor Suy","Espantzay","Nader","Abdul","Abdul","","San Rafael High School"],
  ["Jack","Nathanson","Nader","Nader","Nader","","Archie Williams High School"],
  ["Ashley","Rodas"," Nancy "," Camila ","Camila","","White Hill Middle School"],
  ["Ashley","Rodas"," Nancy "," Camila "," Camila ","","White Hill Middle School"],
  ["Jamie","Lapic"," Nancy "," Nancy "," Nancy ","","Archie Williams High School"],
  ["Will","DeGrassi"," Nancy - PM Only "," Nancy "," Nancy "," Teresa ","Manor Elementary"],
  ["Caroline","Williams"," Nayane "," Nayane ","","","Redwood High School"],
  ["Siena","Beckman"," Nayane "," Nayane ","","","Star Academy"],
  ["Asher","Canessa","Neide"," Neide ","Neide","","The Helix School MS"],
  ["Emma","Mendoza Martinez"," Neide "," Neide "," Neide ","","The Helix School - HS"],
  ["Carlos","Perez Chiroy"," Nik "," Daiane "," Daiane ","","Bahia Visa Elementary"],
  ["Dulcea","Perez Chiroy"," Nik "," Daiane "," Daiane ","","Bahia Visa Elementary"],
  ["Curry","Nguyen"," Nik "," Nik "," Nik ","","Bahia Visa Elementary"],
  ["Edwin","Perez Terraza"," Nik "," Nik "," Nik ","","Bahia Visa Elementary"],
  ["Ihan","Camposeco"," Nik "," Nik "," Nik ","","Bahia Visa Elementary"],
  ["Kimberly","Soriano Vasquez"," Nik "," Nik "," Nik ","","Bahia Visa Elementary"],
  ["Mawangi Gabriel","Munene","Paulo - PM Only","Paulo","Paulo","","The Helix School"],
  ["Blessing","Carson","Paulo","Paulo","Paulo","","Sun Valley Elementary"],
  ["Myles"," Bryan "," Rafael "," Rafael "," Rafael ","","Marindale Pre School"],
  ["Samaile","Toussaint"," Rafael "," Rafael "," Rafael ","","Terra Linda High School"],
  ["Autumn","Dougherty","Renato"," Jose Maria "," Jose Maria ","","Loma Verde Elementary"],
  ["Levi","Goldberg"," Renato "," Elias "," Renato ","","Compass Academy"],
  ["Shanti","Mackay"," Renato "," Renato "," Renato ","","San Andreas High School"],
  ["Riely","Hurd"," Roberto "," Roberto "," Roberto ","","Irene Hunt"],
  ["Soren","Fulvio"," Roberto "," Roberto "," Roberto ","","Oak Hill School"],
  ["Brandon","Beltran"," Rochael "," Rochael "," Rochael ","","Grant Grover"],
  ["Skylar","Pratt"," Rochael "," Rochael "," Rochael ","","Redwood High School"],
  ["Jose","Flores"," Rodrigo "," Rodrigo ","Rodrigo","","Hanna Academy"],
  ["Leivi","Lopez"," Rosenval "," Rosenval "," Rosenval ","","Hanna Academy"],
  ["Yolkin"," Martinez Sanchez "," Teresa "," Dennis "," Dennis ","","Glenwood Elementary"],
  ["Ben"," Richard "," Teresa "," Teresa "," Teresa "," John ","Redwood High School"],
  ["Genesis","Campos"," Teresa - PM Only "," Teresa "," Teresa ","","San Jose Middle"],
  ["Junior","de Leon Campos"," Teresa - PM Only "," Teresa "," Teresa ","","Pleasant Valley School"],
  ["Kaiden","McFarland"," Teresa - Wed Only "," Teresa "," John ","","Lynwood School"],
  ["Tallulah","Sansing"," Thais "," Thais "," Thais ","","Wellspring Ed Services"],
  ["Alexander","O'Hare","Thalita","Thalita"," Thalita ","","Cesar Chavez"],
  ["Emma","Freedman"," Thiago "," Thiago "," Thiago ","","Bayhill Academy"]
];

// Driver name mappings (Sheet short name -> search terms to find in Convex)
const DRIVER_MAPPINGS = {
  "abdul": { search: "abdelhade", fullName: "Abdelhade Salem" },
  "abdel": { search: "abdelhade", fullName: "Abdelhade Salem" },
  "aghanemom": { search: "aghanemom", fullName: "Aghanemom Mykarelly Vaz Dos Santos" },
  "alexandre c": { search: "nascimento carvalho", fullName: "Alexandre Nascimento Carvalho" },
  "alexandre carvalo": { search: "nascimento carvalho", fullName: "Alexandre Nascimento Carvalho" },
  "alexandre nery": { search: "magalhaes nery", fullName: "Alexandre Magalhaes Nery" },
  "amanda": { search: "amanda medeiros", fullName: "Amanda Medeiros Da Silva" },
  "benhur": { search: "benhur", fullName: "Benhur Calixto De Quevedo" },
  "behur": { search: "benhur", fullName: "Benhur Calixto De Quevedo" },
  "camila": { search: "camila custodio", fullName: "Camila Custodio de Oliveira" },
  "cassia": { search: "rita de cassia", fullName: "Rita de Cassia Leal" },
  "daiane": { search: "daiane cristina", fullName: "Daiane Cristina Dos Santos" },
  "daniel": { search: "daniel silva", fullName: "Daniel Silva" },
  "deborah": { search: "deborah thais", fullName: "Deborah Thais De Souza Monteiro" },
  "demilton": { search: "demilton", fullName: "DeMilton dos Santos Lima" },
  "denis": { search: "denis campos", fullName: "Denis Campos" },
  "denis c": { search: "denis campos", fullName: "Denis Campos" },
  "dennis": { search: "denis campos", fullName: "Denis Campos" },
  "elias": { search: "elias pereira", fullName: "Elias Pereira" },
  "evaldo": { search: "evaldo simao", fullName: "Evaldo Simao da Silva" },
  "evelyn": { search: "evelyn lopez", fullName: "Evelyn Lopez Hernandez" },
  "fabianne": { search: "fabiane silva", fullName: "Fabiane Silva Ramos" },
  "fabiano": { search: "fabiano nunes", fullName: "Fabiano Nunes Carvalho" },
  "fatima": { search: "fatima", fullName: "Fatima Unknown" },
  "fernanda c": { search: "fernanda campos", fullName: "Fernanda Campos" },
  "fernanda d": { search: "fernanda david", fullName: "Fernanda David De Moura" },
  "gleiceara": { search: "gleiceara", fullName: "Gleiceara Lima de Sousa Carvalho" },
  "gui": { search: "guilherme felipe", fullName: "Guilherme Felipe Tagliari" },
  "gustavo": { search: "gustavo guimaraes", fullName: "Gustavo Guimaraes de Andrade" },
  "hashim": { search: "hashim", fullName: "Hashim Malal Alzerjawi" },
  "hellia m": { search: "hellia", fullName: "Hellia M Owens" },
  "joana": { search: "joana darc", fullName: "Joana Darc Aparecida" },
  "joel c": { search: "joel correa", fullName: "Joel Correa de Paiva" },
  "john": { search: "john cotten", fullName: "John Cotten" },
  "jose maria": { search: "jose maria", fullName: "Jose Maria Nascimento Filho" },
  "josh": { search: "joshua dos anjos", fullName: "Joshua Dos Anjos Jonas" },
  "juliana": { search: "juliana gomes", fullName: "Juliana Gomes de Souza Andrade" },
  "karla": { search: "karla king", fullName: "Karla King" },
  "lessa": { search: "lessa bianca", fullName: "Lessa Bianca Felipe Tagliari" },
  "lidiane": { search: "lidiane manso", fullName: "Lidiane Manso Maia" },
  "ludmila": { search: "ludmilla dias", fullName: "Ludmilla Dias" },
  "luiz correa": { search: "luiz alan", fullName: "Luiz Alan III Correa Figueira" },
  "marianna": { search: "mariana santos", fullName: "Mariana Santos" },
  "mary": { search: "mary hamilton", fullName: "Mary Hamilton" },
  "nader": { search: "nader husary", fullName: "Nader Husary" },
  "nancy": { search: "nancy eliza", fullName: "Nancy Eliza Ramirez Hernandez" },
  "nayane": { search: "nayane goncalves", fullName: "Nayane Goncalves Menezes" },
  "neide": { search: "neide nogueira", fullName: "Neide Nogueira Marques Serafim" },
  "nik": { search: "nikolaus cotten", fullName: "Nikolaus Cotten" },
  "paulo": { search: "paulo maracaibe", fullName: "Paulo Maracaibe Lima" },
  "rafael": { search: "rafael marques", fullName: "Rafael Marques Tagliari" },
  "renato": { search: "renato serafim", fullName: "Renato Serafim" },
  "rigo": { search: "rigoberto", fullName: "Rigoberto Ochoa Garcia" },
  "roberto": { search: "roberto de araujo", fullName: "Roberto De Araujo Justino" },
  "rochael": { search: "rochael rocha", fullName: "Rochael Rocha de Sousa" },
  "rodrigo": { search: "jefferson rodrigo", fullName: "Jefferson Rodrigo Nascimento Rosa" },
  "rosenval": { search: "rosenval alves", fullName: "Rosenval Alves de Sa" },
  "teresa": { search: "teresa anne", fullName: "Teresa Anne Cotten" },
  "thais": { search: "thais simoes", fullName: "Thais Simoes Sarraff de Rezende" },
  "thalita": { search: "thalita simoes", fullName: "Thalita Simoes Sarraff De Rezende" },
  "thiago": { search: "thiago vieira", fullName: "Thiago Vieira" },
  "victoria": { search: "victoria herrera", fullName: "Victoria Herrera Hernandez" },
  "wender": { search: "wender pereira", fullName: "Wender Pereira da Silva" }
};

// Normalize text: trim and lowercase
function normalize(s) {
  return (s || '').trim().toLowerCase();
}

// Clean driver name from suffixes like "PM Only", "Wed Only", etc.
function cleanDriverName(raw) {
  let n = normalize(raw);
  // Remove known suffixes with regex
  n = n.replace(/\s*-?\s*(pm only|am only|wed only|pm|am)\s*/gi, '');
  // Remove hyphen and anything after
  n = n.replace(/\s*-\s*.*$/, '');
  return n.trim();
}

// Find driver ID from Convex drivers
function findDriverId(sheetName, drivers) {
  const cleaned = cleanDriverName(sheetName);

  // Check mapping first
  const mapping = DRIVER_MAPPINGS[cleaned];
  if (mapping) {
    const searchLower = mapping.search.toLowerCase();
    for (const d of drivers) {
      const fullName = `${d.firstName} ${d.lastName}`.toLowerCase();
      if (fullName.includes(searchLower)) {
        return { id: d._id, name: `${d.firstName} ${d.lastName}`, matched: true };
      }
    }
  }

  // Fallback: try direct firstName match
  for (const d of drivers) {
    if (d.firstName.toLowerCase() === cleaned) {
      return { id: d._id, name: `${d.firstName} ${d.lastName}`, matched: true };
    }
  }

  // Fallback: partial first name match (only if unique)
  const matches = drivers.filter(d => d.firstName.toLowerCase().includes(cleaned));
  if (matches.length === 1) {
    return { id: matches[0]._id, name: `${matches[0].firstName} ${matches[0].lastName}`, matched: true };
  }

  return { id: null, name: null, matched: false };
}

// Find child ID from Convex children
function findChildId(firstName, lastName, children) {
  const f = normalize(firstName);
  const l = normalize(lastName);

  for (const c of children) {
    const cf = normalize(c.firstName);
    const cl = normalize(c.lastName);

    // Exact match
    if (cf === f && cl === l) {
      return { id: c._id, name: `${c.firstName} ${c.lastName}`, matched: true };
    }
  }

  // Partial match on both names (handles cases like Brian "Max" -> Brian "Max")
  for (const c of children) {
    const cf = normalize(c.firstName);
    const cl = normalize(c.lastName);

    if (cf.includes(f) || f.includes(cf)) {
      if (cl.includes(l) || l.includes(cl)) {
        return { id: c._id, name: `${c.firstName} ${c.lastName}`, matched: true };
      }
    }
  }

  return { id: null, name: null, matched: false };
}

// Main verification
async function main() {
  // Load Convex data
  const children = JSON.parse(fs.readFileSync('/tmp/children.json', 'utf8'));
  const drivers = JSON.parse(fs.readFileSync('/tmp/drivers.json', 'utf8'));
  const routes128 = JSON.parse(fs.readFileSync('/tmp/routes128.json', 'utf8'));

  const amRoutes = routes128.AM || [];
  const pmRoutes = routes128.PM || [];

  // Build route lookup maps
  const amByChildId = new Map();
  const pmByChildId = new Map();

  for (const r of amRoutes) {
    amByChildId.set(r.childId, r);
  }
  for (const r of pmRoutes) {
    pmByChildId.set(r.childId, r);
  }

  // Report structures
  const report = {
    amMatched: [],      // Sheet + Convex agree
    amMismatched: [],   // Sheet + Convex disagree on driver
    amMissing: [],      // Sheet has pairing, Convex does not
    amNPU: [],          // No Pickup in Sheet
    pmMatched: [],
    pmMismatched: [],
    pmMissing: [],
    pmNPU: [],
    childNotFound: [],
    driverNotFound: [],
    duplicateRows: [],
    headerRows: [],
  };

  const seenChildren = new Set();

  // Skip header row
  const dataRows = SHEET_DATA.slice(1);

  for (const row of dataRows) {
    const riderFirst = row[0];
    const riderLast = row[1];
    const amDriver = row[2];
    const pmDriver = row[3];
    const school = row[6];

    // Skip header rows that got imported
    if (riderFirst === 'Rider_FirstNm') {
      report.headerRows.push({ firstName: riderFirst, lastName: riderLast });
      continue;
    }

    // Find child
    const childMatch = findChildId(riderFirst, riderLast, children);
    const childKey = `${normalize(riderFirst)}|${normalize(riderLast)}`;

    if (!childMatch.matched) {
      report.childNotFound.push({
        sheetName: `${riderFirst.trim()} ${riderLast.trim()}`,
        school: school,
        amDriver: amDriver,
        pmDriver: pmDriver
      });
      continue;
    }

    // Check for duplicate rows
    if (seenChildren.has(childKey)) {
      report.duplicateRows.push({
        childName: childMatch.name,
        sheetName: `${riderFirst.trim()} ${riderLast.trim()}`
      });
      // Still process it but flag it
    }
    seenChildren.add(childKey);

    const childId = childMatch.id;

    // === AM VERIFICATION ===
    const cleanedAm = cleanDriverName(amDriver);
    if (cleanedAm === 'npu' || cleanedAm === '' || cleanedAm === 'no ride') {
      report.amNPU.push({
        childName: childMatch.name,
        sheetDriver: amDriver.trim()
      });
    } else {
      const amDriverMatch = findDriverId(amDriver, drivers);

      if (!amDriverMatch.matched) {
        report.driverNotFound.push({
          childName: childMatch.name,
          sheetDriver: amDriver.trim(),
          cleaned: cleanedAm,
          period: 'AM'
        });
      } else {
        const convexRoute = amByChildId.get(childId);

        if (!convexRoute) {
          report.amMissing.push({
            childName: childMatch.name,
            childId: childId,
            sheetDriver: amDriverMatch.name,
            driverId: amDriverMatch.id
          });
        } else if (convexRoute.driverId === amDriverMatch.id) {
          report.amMatched.push({
            childName: childMatch.name,
            driverName: amDriverMatch.name,
            convexDriver: convexRoute.driverName
          });
        } else {
          report.amMismatched.push({
            childName: childMatch.name,
            sheetDriver: amDriverMatch.name,
            sheetDriverId: amDriverMatch.id,
            convexDriver: convexRoute.driverName,
            convexDriverId: convexRoute.driverId,
            routeId: convexRoute._id
          });
        }
      }
    }

    // === PM VERIFICATION ===
    const cleanedPm = cleanDriverName(pmDriver);
    if (cleanedPm === 'npu' || cleanedPm === '' || cleanedPm === 'no ride') {
      report.pmNPU.push({
        childName: childMatch.name,
        sheetDriver: pmDriver.trim()
      });
    } else {
      const pmDriverMatch = findDriverId(pmDriver, drivers);

      if (!pmDriverMatch.matched) {
        report.driverNotFound.push({
          childName: childMatch.name,
          sheetDriver: pmDriver.trim(),
          cleaned: cleanedPm,
          period: 'PM'
        });
      } else {
        const convexRoute = pmByChildId.get(childId);

        if (!convexRoute) {
          report.pmMissing.push({
            childName: childMatch.name,
            childId: childId,
            sheetDriver: pmDriverMatch.name,
            driverId: pmDriverMatch.id
          });
        } else if (convexRoute.driverId === pmDriverMatch.id) {
          report.pmMatched.push({
            childName: childMatch.name,
            driverName: pmDriverMatch.name,
            convexDriver: convexRoute.driverName
          });
        } else {
          report.pmMismatched.push({
            childName: childMatch.name,
            sheetDriver: pmDriverMatch.name,
            sheetDriverId: pmDriverMatch.id,
            convexDriver: convexRoute.driverName,
            convexDriverId: convexRoute.driverId,
            routeId: convexRoute._id
          });
        }
      }
    }
  }

  // === PRINT REPORT ===
  console.log('\n' + '='.repeat(80));
  console.log('PAIRING VERIFICATION REPORT: 12/8/2025');
  console.log('='.repeat(80) + '\n');

  console.log(`Sheet rows processed: ${dataRows.length}`);
  console.log(`Convex AM routes: ${amRoutes.length}`);
  console.log(`Convex PM routes: ${pmRoutes.length}`);
  console.log(`Convex children: ${children.length}`);
  console.log(`Convex drivers: ${drivers.length}`);

  console.log('\n' + '-'.repeat(40));
  console.log('SUMMARY');
  console.log('-'.repeat(40));
  console.log(`\n✅ AM Matched:     ${report.amMatched.length}`);
  console.log(`✅ PM Matched:     ${report.pmMatched.length}`);
  console.log(`\n⚠️  AM Mismatched:  ${report.amMismatched.length}`);
  console.log(`⚠️  PM Mismatched:  ${report.pmMismatched.length}`);
  console.log(`\n❌ AM Missing:     ${report.amMissing.length}`);
  console.log(`❌ PM Missing:     ${report.pmMissing.length}`);
  console.log(`\n🚫 AM NPU (skip):  ${report.amNPU.length}`);
  console.log(`🚫 PM NPU (skip):  ${report.pmNPU.length}`);
  console.log(`\n👤 Children not found:  ${report.childNotFound.length}`);
  console.log(`🚗 Drivers not found:   ${report.driverNotFound.length}`);
  console.log(`📋 Duplicate rows:      ${report.duplicateRows.length}`);
  console.log(`📋 Header rows:         ${report.headerRows.length}`);

  if (report.childNotFound.length > 0) {
    console.log('\n' + '-'.repeat(40));
    console.log('CHILDREN NOT FOUND IN CONVEX (need to add or fix name)');
    console.log('-'.repeat(40));
    for (const c of report.childNotFound) {
      console.log(`  - "${c.sheetName}" (${c.school})`);
    }
  }

  if (report.driverNotFound.length > 0) {
    console.log('\n' + '-'.repeat(40));
    console.log('DRIVERS NOT FOUND (need to add mapping)');
    console.log('-'.repeat(40));
    const unique = new Map();
    for (const d of report.driverNotFound) {
      if (!unique.has(d.cleaned)) {
        unique.set(d.cleaned, d);
      }
    }
    for (const [key, d] of unique) {
      console.log(`  - "${d.sheetDriver}" -> "${d.cleaned}" (for ${d.childName})`);
    }
  }

  if (report.amMismatched.length > 0) {
    console.log('\n' + '-'.repeat(40));
    console.log('AM MISMATCHED - Sheet vs Convex disagree');
    console.log('-'.repeat(40));
    for (const m of report.amMismatched) {
      console.log(`  - ${m.childName}: Sheet="${m.sheetDriver}" vs Convex="${m.convexDriver}"`);
    }
  }

  if (report.pmMismatched.length > 0) {
    console.log('\n' + '-'.repeat(40));
    console.log('PM MISMATCHED - Sheet vs Convex disagree');
    console.log('-'.repeat(40));
    for (const m of report.pmMismatched) {
      console.log(`  - ${m.childName}: Sheet="${m.sheetDriver}" vs Convex="${m.convexDriver}"`);
    }
  }

  if (report.amMissing.length > 0) {
    console.log('\n' + '-'.repeat(40));
    console.log('AM MISSING FROM CONVEX - Sheet says pair, Convex has no route');
    console.log('-'.repeat(40));
    for (const m of report.amMissing) {
      console.log(`  - ${m.childName} → ${m.sheetDriver}`);
    }
  }

  if (report.pmMissing.length > 0) {
    console.log('\n' + '-'.repeat(40));
    console.log('PM MISSING FROM CONVEX - Sheet says pair, Convex has no route');
    console.log('-'.repeat(40));
    for (const m of report.pmMissing) {
      console.log(`  - ${m.childName} → ${m.sheetDriver}`);
    }
  }

  if (report.duplicateRows.length > 0) {
    console.log('\n' + '-'.repeat(40));
    console.log('DUPLICATE ROWS IN SHEET');
    console.log('-'.repeat(40));
    for (const d of report.duplicateRows) {
      console.log(`  - ${d.childName} (appears multiple times)`);
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('END OF REPORT');
  console.log('='.repeat(80) + '\n');

  // Save detailed report as JSON
  fs.writeFileSync('/tmp/pairing-report.json', JSON.stringify(report, null, 2));
  console.log('Detailed report saved to /tmp/pairing-report.json');
}

main().catch(console.error);
