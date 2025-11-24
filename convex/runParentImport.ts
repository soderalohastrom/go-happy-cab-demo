/**
 * Parent Data Import Script
 * 
 * Fetches all parent data from Google Sheets and imports into Convex
 * 
 * Usage:
 *   npx tsx convex/runParentImport.ts
 * 
 * OR if tsx not installed:
 *   npm install -g tsx
 *   npx tsx convex/runParentImport.ts
 */

import { ConvexHttpClient } from "convex/browser";

// Your Convex deployment URL
const CONVEX_URL = "https://colorful-wildcat-524.convex.cloud";

// Google Sheets data (fetched from Sheet ID: 1AJ2pvYuwX_A8AOv8elo9aNugzysVaHVHfMx3mXK0egA)
const PARENT_DATA = [
    {
        parentFirstName: "Adam",
        parentLastName: "Compton",
        title: "Evander Compton Parent",
        phone: "916-225-2019",
        school: "Anova Center",
        childFirstName: "Evander",
        childLastName: "Compton",
        street: "1051 Las Rapodas",
        unit: "",
        city: "San Rafael",
        zip: "94903"
    },
    {
        parentFirstName: "Adam",
        parentLastName: "Rosenblum",
        title: "Mara Rosenblum Parent",
        phone: "201-615-5117",
        school: "Hamilton School TK - 8",
        childFirstName: "Mara",
        childLastName: "Rosenblum",
        street: "32 Terrace Drive",
        unit: "",
        city: "Marin City",
        zip: "94949"
    },
    {
        parentFirstName: "Alexander",
        parentLastName: "Rodas",
        title: "Riely Rodas Parent",
        phone: "415-532-4948",
        school: "Indian Valley College",
        childFirstName: "Riely",
        childLastName: "Rodas",
        street: "159 Novato Street ",
        unit: "#1",
        city: " San Rafael ",
        zip: "94949"
    },
    {
        parentFirstName: "Ally",
        parentLastName: "Mitchell",
        title: "Getty Mitchell Parent",
        phone: "415-246-8904",
        school: "Oak Hill School",
        childFirstName: "Getty",
        childLastName: "Mitchell",
        street: " 2111 5th Ave ",
        unit: "",
        city: "San Rafael",
        zip: "94901"
    },
    {
        parentFirstName: "Alma",
        parentLastName: "Elizondo-Bailey",
        title: "Andrea/Isabel Gutierrez Parent",
        phone: "(415) 515-9290",
        school: "Redwood High School",
        childFirstName: "Andrea/Isabel",
        childLastName: "Gutierrez",
        street: "20 Pine Terrace",
        unit: "",
        city: "Belvedere",
        zip: ""
    },
    {
        parentFirstName: "Aloys",
        parentLastName: "Jordan",
        title: "Tucker Jordan Parent",
        phone: "415-259-8973",
        school: "Compass Academy",
        childFirstName: "Tucker",
        childLastName: "Jordan",
        street: "143 Oak Manor Drive",
        unit: "",
        city: "Fairfax",
        zip: "94930"
    },
    {
        parentFirstName: "Althaea",
        parentLastName: "Greenstone",
        title: "Samantha Greenstone Parent",
        phone: "415-336-7355",
        school: "Orion High School",
        childFirstName: "Samantha",
        childLastName: "Greenstone",
        street: "450 Edgewood Ave",
        unit: "",
        city: "Mill Valley",
        zip: "94941"
    },
    {
        parentFirstName: "Amilicar",
        parentLastName: "Sandoval",
        title: "Amilcar Sandoval Parent",
        phone: "415-650-9366",
        school: "Compass Academy",
        childFirstName: "Amilcar",
        childLastName: "Sandoval",
        street: "320 Channing Way",
        unit: "#132",
        city: "San Rafael",
        zip: "94901"
    },
    {
        parentFirstName: "Amy",
        parentLastName: "Whitehouse",
        title: "Kai Whitehouse Parent",
        phone: "415200-8434",
        school: "Terra Linda High School",
        childFirstName: "Kai",
        childLastName: "Whitehouse",
        street: " 10 Isabella Court ",
        unit: "",
        city: " Novato ",
        zip: ""
    },
    {
        parentFirstName: "Andrea",
        parentLastName: "Wyllie",
        title: "Gabriella Wyllie Parent",
        phone: "415-793-5550",
        school: "Archie Williams High School",
        childFirstName: "Gabriella",
        childLastName: "Wyllie",
        street: "33 Seamast Passage",
        unit: "",
        city: "Corte Madera",
        zip: "94925"
    },
    {
        parentFirstName: "Angie",
        parentLastName: "Traeger",
        title: "Thomas Traeger Parent",
        phone: "415-847-8858",
        school: "Compass Academy",
        childFirstName: "Thomas",
        childLastName: "Traeger",
        street: "150 Canal Street",
        unit: "",
        city: "San Rafael",
        zip: "94901"
    },
    {
        parentFirstName: "Anna",
        parentLastName: "Luke",
        title: "Ethan Luke Parent",
        phone: "415-271-9093",
        school: "Anova Center",
        childFirstName: "Ethan",
        childLastName: "Luke",
        street: "109 Bretano Way",
        unit: "",
        city: "Greenbrae",
        zip: "94904"
    },
    {
        parentFirstName: "Anne",
        parentLastName: "Munene",
        title: "Mawangi Gabriel Munene Parent",
        phone: "415-299-0525",
        school: "The Helix School",
        childFirstName: "Mawangi Gabriel",
        childLastName: "Munene",
        street: "45 San Carlos Way",
        unit: "",
        city: "Novato",
        zip: ""
    },
    {
        parentFirstName: "Annie",
        parentLastName: "Riedel",
        title: "Eloise Riedel Parent",
        phone: "917-345-3152",
        school: "Star Academy - Post HS",
        childFirstName: "Eloise",
        childLastName: "Riedel",
        street: "380 Bretamo Way",
        unit: "",
        city: "Greenbrae",
        zip: ""
    },
    {
        parentFirstName: "Annie",
        parentLastName: "Ott",
        title: "James \"Lincoln\" Ott Parent",
        phone: "925 285 0675",
        school: "CCS Trips",
        childFirstName: "James \"Lincoln\"",
        childLastName: "Ott",
        street: "465 Peachstone Terrace",
        unit: "",
        city: "San Rafael",
        zip: "94901"
    },
    {
        parentFirstName: "Annie",
        parentLastName: "Ott",
        title: "James \"Lincoln\" Ott Parent",
        phone: "925 285 0675",
        school: "Lucas Valley Elementary",
        childFirstName: "James \"Lincoln\"",
        childLastName: "Ott",
        street: "465 Peachstone Terrace",
        unit: "",
        city: "San Rafael",
        zip: "94901"
    },
    {
        parentFirstName: "Arwin",
        parentLastName: "Compton",
        title: "Evander Compton Parent",
        phone: "626-376-5917",
        school: "Anova Center",
        childFirstName: "Evander",
        childLastName: "Compton",
        street: "1051 Las Rapodas",
        unit: "",
        city: "San Rafael",
        zip: "94903"
    },
    {
        parentFirstName: "Ashley",
        parentLastName: "McFarland",
        title: "Kaiden McFarland Parent",
        phone: "415-203-7005",
        school: "Lynwood School",
        childFirstName: "Kaiden",
        childLastName: "McFarland",
        street: "1320 Lynwood Drive",
        unit: "",
        city: "Novato",
        zip: "94947"
    },
    {
        parentFirstName: "Ashley",
        parentLastName: "Hurd",
        title: "Riely Hurd Parent",
        phone: "415-686-3516",
        school: "Irene Hunt",
        childFirstName: "Riely",
        childLastName: "Hurd",
        street: "148 Knight Drive San Rafael",
        unit: "",
        city: " San Rafael ",
        zip: ""
    },
    {
        parentFirstName: "Ashley - Aide",
        parentLastName: "Evans",
        title: "Tony Graglia Parent",
        phone: "646-651-6609",
        school: "The Helix School",
        childFirstName: "Tony",
        childLastName: "Graglia",
        street: "30 Kite Hill Lane",
        unit: "",
        city: "Mill Valley",
        zip: "94941"
    },
    {
        parentFirstName: "Astrid",
        parentLastName: "Medrano",
        title: "Hansel Medrano Parent",
        phone: "",
        school: "San Rafael High School",
        childFirstName: "Hansel",
        childLastName: "Medrano",
        street: " 24 Graceland Drive ",
        unit: "",
        city: " San Rafael ",
        zip: ""
    },
    {
        parentFirstName: "Brenda",
        parentLastName: "Soriano Vasquez",
        title: "Kimberly Soriano Vasquez Parent",
        phone: "415-965-9802",
        school: "Bahia Visa Elementary",
        childFirstName: "Kimberly",
        childLastName: "Soriano Vasquez",
        street: "515 D Street ",
        unit: "10",
        city: "San Rafael",
        zip: "94901"
    },
    {
        parentFirstName: "Brenda",
        parentLastName: "Cloney",
        title: "Shannon Cloney Parent",
        phone: "707-921-9975",
        school: "Costco - Work",
        childFirstName: "Shannon",
        childLastName: "Cloney",
        street: "484 Noonan Ranch Lane",
        unit: "",
        city: "Santa Rosa",
        zip: "95403"
    },
    {
        parentFirstName: "Brett",
        parentLastName: "Mitchell",
        title: "Getty Mitchell Parent",
        phone: "415-246-5541",
        school: "Oak Hill School",
        childFirstName: "Getty",
        childLastName: "Mitchell",
        street: " 2111 5th Ave ",
        unit: "",
        city: "San Rafael",
        zip: "94901"
    },
    {
        parentFirstName: "Bridget",
        parentLastName: "Kavanagh",
        title: "Milo Jaffee Parent",
        phone: "415-377-4416",
        school: "Archie Williams High School",
        childFirstName: "Milo",
        childLastName: "Jaffee",
        street: "530 Tamalpais Drive",
        unit: "",
        city: "Corte Madera",
        zip: "94925"
    },
    {
        parentFirstName: "Brooke",
        parentLastName: "Constantino",
        title: "Huxley Constantino Parent",
        phone: "415-686-0424",
        school: "Bel Air Elementary",
        childFirstName: "Huxley",
        childLastName: "Constantino",
        street: "34 Alyssum Court",
        unit: "",
        city: "Novato",
        zip: "94945"
    },
    {
        parentFirstName: "Bruce",
        parentLastName: "Pratt",
        title: "Skylar Pratt Parent",
        phone: "415-516-1993",
        school: "Redwood High School",
        childFirstName: "Skylar",
        childLastName: "Pratt",
        street: "34 Crecienta Drive",
        unit: "",
        city: "Sausalito",
        zip: ""
    },
    {
        parentFirstName: "Byron",
        parentLastName: "Gonzalez Hernandez",
        title: "Wasley Gonzalez Hernandez Parent",
        phone: "415-889-3590",
        school: "Lucas Valley Elementary",
        childFirstName: "Wasley",
        childLastName: "Gonzalez Hernandez",
        street: "260 Canal Street",
        unit: "422",
        city: "San Rafael",
        zip: "94901"
    },
    {
        parentFirstName: "Camila",
        parentLastName: "Sontay Hernandez",
        title: "Melanie Sontay Hernandez Parent",
        phone: "415-419-9579",
        school: "Hamilton School 3rd Grade",
        childFirstName: "Melanie",
        childLastName: "Sontay Hernandez",
        street: "119 Nova Albion Way ",
        unit: "311",
        city: "San Rafael",
        zip: "94901"
    },
    {
        parentFirstName: "Careli",
        parentLastName: "de La Cruz",
        title: "Josseph de La Cruz Parent",
        phone: "415-879-1864",
        school: "Redwood High School",
        childFirstName: "Josseph",
        childLastName: "de La Cruz",
        street: "140 Lower Via Casitas",
        unit: "1",
        city: "Greenbrae",
        zip: "94904"
    },
    {
        parentFirstName: "Carleen",
        parentLastName: "Delay",
        title: "Penny Delay Parent",
        phone: "917-488-6554",
        school: "Bacich Elementary",
        childFirstName: "Penny",
        childLastName: "Delay",
        street: "46 Birch Ave",
        unit: "",
        city: "Larkspur",
        zip: "94939"
    },
    {
        parentFirstName: "Carolina",
        parentLastName: "Hernandez Gil",
        title: "Jonathan Hernandez Gil Parent",
        phone: "415-271-2971",
        school: "Compass Academy",
        childFirstName: "Jonathan",
        childLastName: "Hernandez Gil",
        street: "237 Picnic Ave, #2",
        unit: "",
        city: "San Rafael",
        zip: "94901"
    },
    {
        parentFirstName: "Carolyn",
        parentLastName: "Reible",
        title: "Rosalie Reible Parent",
        phone: "415-515-4005",
        school: "Grant Grover",
        childFirstName: "Rosalie",
        childLastName: "Reible",
        street: " 29 Upper Oak Drive ",
        unit: "",
        city: " San Rafael ",
        zip: ""
    },
    {
        parentFirstName: "Charles",
        parentLastName: "Schoenhoeft",
        title: "Casey \"Caz\" Schoenhoeft Parent",
        phone: "415-819-1400",
        school: "Oak Hill School",
        childFirstName: "Casey \"Caz\"",
        childLastName: "Schoenhoeft",
        street: "39 Mountain View Ave",
        unit: "",
        city: "Mill Valley",
        zip: "94941"
    },
    {
        parentFirstName: "Charlotte",
        parentLastName: "Sanders",
        title: "Edmund \"Neddy\" Murray Parent",
        phone: "415-407-7211",
        school: "Oak Hill School",
        childFirstName: "Edmund \"Neddy\"",
        childLastName: "Murray",
        street: "651 Eastwood Way",
        unit: "",
        city: "Mill Valley",
        zip: "94941"
    },
    {
        parentFirstName: "Cheng",
        parentLastName: "Compton",
        title: "Cashis Compton Parent",
        phone: "415-754-5737",
        school: "Archie Williams High School",
        childFirstName: "Cashis",
        childLastName: "Compton",
        street: "56 Terrace Drive",
        unit: "#24",
        city: "Marin City",
        zip: "94965"
    },
    {
        parentFirstName: "Chetan",
        parentLastName: "Sihra",
        title: "Isadora Sihra Parent",
        phone: "415-823-6360",
        school: "Oak Hill School",
        childFirstName: "Isadora",
        childLastName: "Sihra",
        street: "414 View Park Court",
        unit: "",
        city: "Mill Valley",
        zip: "94941"
    },
    {
        parentFirstName: "Christi",
        parentLastName: "Holbrook",
        title: "Sophia Ingoldsby Parent",
        phone: "415-290-6331",
        school: "Artistry Studios",
        childFirstName: "Sophia",
        childLastName: "Ingoldsby",
        street: "1125 West California Avenue",
        unit: "",
        city: "Mill Valley",
        zip: "94941"
    },
    {
        parentFirstName: "Christian",
        parentLastName: "Toussaint",
        title: "Samaile Toussaint Parent",
        phone: "415-328-4635",
        school: "Terra Linda High School",
        childFirstName: "Samaile",
        childLastName: "Toussaint",
        street: "12 Nave Court",
        unit: "",
        city: "Novato",
        zip: ""
    },
    {
        parentFirstName: "Christina",
        parentLastName: "Hawkins",
        title: "Dylan Hawkins Parent",
        phone: "510-672-0605",
        school: "Irene Hunt",
        childFirstName: "Dylan",
        childLastName: "Hawkins",
        street: "35 Corinthian Court",
        unit: "",
        city: "Novato",
        zip: "94947"
    },
    {
        parentFirstName: "Christy",
        parentLastName: "Gillard",
        title: "Lachlan Gillard Parent",
        phone: "415-827-0247",
        school: "Anova Center",
        childFirstName: "Lachlan",
        childLastName: "Gillard",
        street: "317 West Ridge Place",
        unit: "",
        city: "Petaluma",
        zip: "94952"
    },
    {
        parentFirstName: "Colin",
        parentLastName: "Sanford",
        title: "Mae Sanford Parent",
        phone: "203-918-4347",
        school: "Redwood High School",
        childFirstName: "Mae",
        childLastName: "Sanford",
        street: "8 Oak Grove Ave",
        unit: "",
        city: "Woodacre",
        zip: "94952"
    },
    {
        parentFirstName: "Courtney",
        parentLastName: "Bigelow",
        title: "Huxley Constantino Parent",
        phone: "415-686-2545",
        school: "Bel Air Elementary",
        childFirstName: "Huxley",
        childLastName: "Constantino",
        street: "34 Alyssum Court",
        unit: "",
        city: "Novato",
        zip: "94945"
    },
    {
        parentFirstName: "Daniel",
        parentLastName: "Nathanson",
        title: "Jack Nathanson Parent",
        phone: "415-517-7317",
        school: "Archie Williams High School",
        childFirstName: "Jack",
        childLastName: "Nathanson",
        street: "8 Pomeroy Road",
        unit: "",
        city: "Ross",
        zip: ""
    },
    {
        parentFirstName: "Daniel",
        parentLastName: "Nathanson",
        title: "Olivia Nathanson Parent",
        phone: "415-517-7317",
        school: "San Domenico to Horse Ranch",
        childFirstName: "Olivia",
        childLastName: "Nathanson",
        street: "8 Pomeroy Road",
        unit: "",
        city: "Ross",
        zip: ""
    },
    {
        parentFirstName: "Dante",
        parentLastName: "Anderson",
        title: "Brian \"Max\" Anderson Parent",
        phone: "",
        school: "Hanna Academy",
        childFirstName: "Brian \"Max\"",
        childLastName: "Anderson",
        street: "106 Cabro RDG",
        unit: "",
        city: "Novato",
        zip: "94947"
    },
    {
        parentFirstName: "Darryl",
        parentLastName: "Compton",
        title: "Cashis Compton Parent",
        phone: "628-245-6277",
        school: "Archie Williams High School",
        childFirstName: "Cashis",
        childLastName: "Compton",
        street: "56 Terrace Drive",
        unit: "#24",
        city: "Marin City",
        zip: "94965"
    },
    {
        parentFirstName: "David",
        parentLastName: "Luna",
        title: "David Luna Parent",
        phone: "415-524-6329",
        school: "Compass Academy",
        childFirstName: "David",
        childLastName: "Luna",
        street: "119 Nova Albion Way",
        unit: "#114",
        city: "San Rafael",
        zip: "94901"
    },
    {
        parentFirstName: "David",
        parentLastName: "Greenstone",
        title: "Samantha Greenstone Parent",
        phone: "415-596-1479",
        school: "Orion High School",
        childFirstName: "Samantha",
        childLastName: "Greenstone",
        street: "450 Edgewood Ave",
        unit: "",
        city: "Mill Valley",
        zip: "94941"
    },
    {
        parentFirstName: "Debbie",
        parentLastName: "Moran",
        title: "Geffen Moran Parent",
        phone: "(415) 637-2418",
        school: "The Helix School",
        childFirstName: "Geffen",
        childLastName: "Moran",
        street: "",
        unit: "",
        city: "",
        zip: ""
    },
    {
        parentFirstName: "Demitri",
        parentLastName: "Botaitas",
        title: "Xenia Botaitas Parent",
        phone: "415-595-3110",
        school: "Hall Middle School",
        childFirstName: "Xenia",
        childLastName: "Botaitas",
        street: "859 East Blythedale",
        unit: "",
        city: "Mill Valley",
        zip: ""
    },
    {
        parentFirstName: "Denise",
        parentLastName: "Goldberg",
        title: "Levi Goldberg Parent",
        phone: "415-794-5380",
        school: "Compass Academy",
        childFirstName: "Levi",
        childLastName: "Goldberg",
        street: "700 Las Colindas Rd",
        unit: "",
        city: "San Rafael",
        zip: "94901"
    },
    {
        parentFirstName: "Denise",
        parentLastName: "Toussaint",
        title: "Samaile Toussaint Parent",
        phone: "415-724-7144",
        school: "Terra Linda High School",
        childFirstName: "Samaile",
        childLastName: "Toussaint",
        street: "12 Nave Court",
        unit: "",
        city: "Novato",
        zip: ""
    },
    {
        parentFirstName: "Derek",
        parentLastName: "Wyllie",
        title: "Gabriella Wyllie Parent",
        phone: "415-793-6571",
        school: "Archie Williams High School",
        childFirstName: "Gabriella",
        childLastName: "Wyllie",
        street: "33 Seamast Passage",
        unit: "",
        city: "Corte Madera",
        zip: "94925"
    },
    {
        parentFirstName: "Derek",
        parentLastName: "Glover",
        title: "Jeremy Glover Parent",
        phone: "510-368-0657",
        school: "Miller Creek Middle",
        childFirstName: "Jeremy",
        childLastName: "Glover",
        street: "1089 Lea Drive",
        unit: "",
        city: "San Rafael",
        zip: "94901"
    },
    {
        parentFirstName: "Diana",
        parentLastName: "Newton",
        title: "Hunter Newton Parent",
        phone: "(415) 755-8031",
        school: "Hamilton School TK - 3rd Grade",
        childFirstName: "Hunter",
        childLastName: "Newton",
        street: "100 Meadow Valley Rd",
        unit: "Unit D",
        city: "Corte Madera",
        zip: "94949"
    },
    {
        parentFirstName: "Diana",
        parentLastName: "Stuart",
        title: "Twila Stuart Parent",
        phone: "415-386-8448",
        school: "Star Academy - Post HS",
        childFirstName: "Twila",
        childLastName: "Stuart",
        street: "123 Lagunitas Road",
        unit: "",
        city: "Ross",
        zip: ""
    },
    {
        parentFirstName: "Doug",
        parentLastName: "Traeger",
        title: "Thomas Traeger Parent",
        phone: "415-847-8829",
        school: "Compass Academy",
        childFirstName: "Thomas",
        childLastName: "Traeger",
        street: "150 Canal Street",
        unit: "",
        city: "San Rafael",
        zip: "94901"
    },
    {
        parentFirstName: "Douglas",
        parentLastName: "Stewart",
        title: "Twila Stuart Parent",
        phone: "415-386-8448",
        school: "Star Academy - Post HS",
        childFirstName: "Twila",
        childLastName: "Stuart",
        street: "123 Lagunitas Road",
        unit: "",
        city: "Ross",
        zip: ""
    },
    {
        parentFirstName: "Dulcinea",
        parentLastName: "Sihra",
        title: "Isadora Sihra Parent",
        phone: "415-660-8001",
        school: "Oak Hill School",
        childFirstName: "Isadora",
        childLastName: "Sihra",
        street: "414 View Park Court",
        unit: "",
        city: "Mill Valley",
        zip: "94941"
    },
    {
        parentFirstName: "Elizabeth",
        parentLastName: "Kernon",
        title: "Ben Kernon Parent",
        phone: "415-823-1417",
        school: "Star Academy - Post HS",
        childFirstName: "Ben",
        childLastName: "Kernon",
        street: "626 Northern Ave",
        unit: "",
        city: "Mill Valley",
        zip: ""
    },
    {
        parentFirstName: "Elizabeth",
        parentLastName: "Murray",
        title: "Edmund \"Neddy\" Murray Parent",
        phone: "415-317-6177",
        school: "Oak Hill School",
        childFirstName: "Edmund \"Neddy\"",
        childLastName: "Murray",
        street: "651 Eastwood Way",
        unit: "",
        city: "Mill Valley",
        zip: "94941"
    },
    {
        parentFirstName: "Elizabeth",
        parentLastName: "Brown-Lewin",
        title: "Eliza Brown-Lewin Parent",
        phone: "415-425-0958",
        school: "Grant Grover",
        childFirstName: "Eliza",
        childLastName: "Brown-Lewin",
        street: "929 West California Avenue",
        unit: "",
        city: "Mill Valley",
        zip: "94941"
    },
    {
        parentFirstName: "Ellian",
        parentLastName: "Klein",
        title: "Rowan Klein Parent",
        phone: "415-858-5585",
        school: "Cypress School",
        childFirstName: "Rowan",
        childLastName: "Klein",
        street: "25 Bella Vista Ave",
        unit: "",
        city: "San Anselmo",
        zip: ""
    },
    {
        parentFirstName: "Ellian",
        parentLastName: "Klien",
        title: "Rowan Klein Parent",
        phone: "415-858-5584",
        school: "Cypress School",
        childFirstName: "Rowan",
        childLastName: "Klein",
        street: "25 Bella Vista Ave",
        unit: "",
        city: "San Anselmo",
        zip: ""
    },
    {
        parentFirstName: "Elvira",
        parentLastName: "Lopez",
        title: "Leivi Lopez Parent",
        phone: "415-506-4210",
        school: "Hanna Academy",
        childFirstName: "Leivi",
        childLastName: "Lopez",
        street: "3 Hathaway Drive",
        unit: "311",
        city: "Novato",
        zip: "94949"
    },
    {
        parentFirstName: "Emily",
        parentLastName: "Rettberg",
        title: "Isaac Rettberg Parent",
        phone: "510-390-3807",
        school: "Irene Hunt",
        childFirstName: "Isaac",
        childLastName: "Rettberg",
        street: "210 El Prado Ave",
        unit: "",
        city: "San Rafael",
        zip: "94903"
    },
    {
        parentFirstName: "Emily",
        parentLastName: "DeGrassi",
        title: "Will DeGrassi Parent",
        phone: "415-264-2484",
        school: "Manor Elementary",
        childFirstName: "Will",
        childLastName: "DeGrassi",
        street: "182 Meadowcroft Drive",
        unit: "",
        city: "San Anselmo",
        zip: "94960"
    },
    {
        parentFirstName: "Eric",
        parentLastName: "Schaefer",
        title: "Milo Schaefer Parent",
        phone: "415-828-1112",
        school: "Anova Center",
        childFirstName: "Milo",
        childLastName: "Schaefer",
        street: "35 McAllister Ave",
        unit: "",
        city: "Kentfield",
        zip: "94904"
    },
    {
        parentFirstName: "Eric",
        parentLastName: "Jaffe",
        title: "Milo Jaffee Parent",
        phone: "415-235-7822",
        school: "Archie Williams High School",
        childFirstName: "Milo",
        childLastName: "Jaffee",
        street: "530 Tamalpais Drive",
        unit: "",
        city: "Corte Madera",
        zip: "94925"
    },
    {
        parentFirstName: "Erica",
        parentLastName: "Purdy",
        title: "Hudson Purdy Parent",
        phone: "415-384-1350",
        school: "The Helix School MS",
        childFirstName: "Hudson",
        childLastName: "Purdy",
        street: "944 Greenhil Rd",
        unit: "",
        city: "Mill Valley",
        zip: "94941"
    },
    {
        parentFirstName: "Erin",
        parentLastName: "Giacoppa",
        title: "Michaela Giacoppa Parent",
        phone: "415-250-1098",
        school: "Grant Grover",
        childFirstName: "Michaela",
        childLastName: "Giacoppa",
        street: "1893 Mar West Street",
        unit: "",
        city: "Tiburon",
        zip: ""
    },
    {
        parentFirstName: "Ernest",
        parentLastName: "Waters",
        title: "Brandon Kitterman Parent",
        phone: "415-306-4539",
        school: "Compass Academy",
        childFirstName: "Brandon",
        childLastName: "Kitterman",
        street: "160 Shannandoah Place",
        unit: "",
        city: "San Rafael",
        zip: "94903"
    },
    {
        parentFirstName: "Eva",
        parentLastName: "Ramirez-Preciado",
        title: "Roy Ramirez-Preciado Parent",
        phone: "415-524-6528",
        school: "Grant Grover",
        childFirstName: "Roy",
        childLastName: "Ramirez-Preciado",
        street: "475 Ignacio Blvd",
        unit: "259",
        city: "Novato",
        zip: "94949"
    },
    {
        parentFirstName: "Gabriela",
        parentLastName: "Maldonado",
        title: "Yadiel Maldonado Parent",
        phone: "415-504-5857",
        school: "Lucas Valley Elementary",
        childFirstName: "Yadiel",
        childLastName: "Maldonado",
        street: "20 Green Way",
        unit: "11",
        city: "San Rafael",
        zip: "94901"
    },
    {
        parentFirstName: "Geraldine",
        parentLastName: "Kitterman",
        title: "Brandon Kitterman Parent",
        phone: "415-342-7344",
        school: "Compass Academy",
        childFirstName: "Brandon",
        childLastName: "Kitterman",
        street: "160 Shannandoah Place",
        unit: "",
        city: "San Rafael",
        zip: "94903"
    },
    {
        parentFirstName: "Gilberto",
        parentLastName: "Maldonado",
        title: "Yadiel Maldonado Parent",
        phone: "415-726-8871",
        school: "Lucas Valley Elementary",
        childFirstName: "Yadiel",
        childLastName: "Maldonado",
        street: "20 Green Way",
        unit: "11",
        city: "San Rafael",
        zip: "94901"
    },
    {
        parentFirstName: "Gina",
        parentLastName: "Banducci-Camona",
        title: "Jasmin Banducci-Camona Parent",
        phone: "415-747-1344",
        school: "Indian Valley College",
        childFirstName: "Jasmin",
        childLastName: "Banducci-Camona",
        street: "20 Ivy Lane",
        unit: "",
        city: "Woodacre",
        zip: "94973"
    },
    {
        parentFirstName: "Gloria",
        parentLastName: "Suy",
        title: "Mynor Suy Espantzay Parent",
        phone: "415-933-4068",
        school: "San Rafael High School",
        childFirstName: "Mynor Suy",
        childLastName: "Espantzay",
        street: " 450 Entrada Drive ",
        unit: "",
        city: " Novato ",
        zip: "94949"
    },
    {
        parentFirstName: "Gray",
        parentLastName: "Dougherty",
        title: "Autumn Dougherty Parent",
        phone: "(516) 633-3833",
        school: "Loma Verde Elementary",
        childFirstName: "Autumn",
        childLastName: "Dougherty",
        street: "642 Woodbine Drive",
        unit: "",
        city: "San Rafeal",
        zip: "94903"
    },
    {
        parentFirstName: "Greg",
        parentLastName: "Canessa",
        title: "Asher Canessa Parent",
        phone: "206-931-7775",
        school: "The Helix School MS",
        childFirstName: "Asher",
        childLastName: "Canessa",
        street: "6 Arrowood Lane",
        unit: "",
        city: "Fairfax",
        zip: "94930"
    },
    {
        parentFirstName: "Greg",
        parentLastName: "Shelley",
        title: "Jesse Shelley Parent",
        phone: "415-747-0448",
        school: "Archie Williams High School",
        childFirstName: "Jesse",
        childLastName: "Shelley",
        street: " 7460 Sir Francis Drave Blvd ",
        unit: "",
        city: " Lagunitas ",
        zip: "94938"
    },
    {
        parentFirstName: "Greg",
        parentLastName: "Shelley",
        title: "Jesse Shelley Parent",
        phone: "415-747-0448",
        school: "Archie Williams High School",
        childFirstName: "Jesse",
        childLastName: "Shelley",
        street: " 7460 Sir Francis Drave Blvd ",
        unit: "",
        city: " Lagunitas ",
        zip: "94938"
    },
    {
        parentFirstName: "Greg",
        parentLastName: "Goldberg",
        title: "Levi Goldberg Parent",
        phone: "415-676-9129",
        school: "Compass Academy",
        childFirstName: "Levi",
        childLastName: "Goldberg",
        street: "700 Las Colindas Rd",
        unit: "",
        city: "San Rafael",
        zip: "94901"
    },
    {
        parentFirstName: "Guadalupe",
        parentLastName: "Pulido ",
        title: "Jose Flores Case Worker",
        phone: "415-858-5421",
        school: "Hanna Academy",
        childFirstName: "Jose",
        childLastName: "Flores",
        street: "8 Giacomini Rd",
        unit: "",
        city: "Point Reyes",
        zip: "94956"
    },
    {
        parentFirstName: "Hadji",
        parentLastName: "Bryan",
        title: "Myles Bryan Parent",
        phone: "415-302-3972",
        school: "Marindale Pre School",
        childFirstName: "Myles",
        childLastName: "Bryan",
        street: " 1255 Royal Oak Terrace ",
        unit: "",
        city: " Novato ",
        zip: "94947"
    },
    {
        parentFirstName: "Hayes",
        parentLastName: "Handler",
        title: "Moses Radar Parent",
        phone: "347-351-5776",
        school: "San Jose Middle",
        childFirstName: "Moses",
        childLastName: "Radar",
        street: "61 Angela Ave",
        unit: "",
        city: "San Anselmo",
        zip: "94960"
    },
    {
        parentFirstName: "Heather",
        parentLastName: "Canessa",
        title: "Asher Canessa Parent",
        phone: "425-753-5775",
        school: "The Helix School MS",
        childFirstName: "Asher",
        childLastName: "Canessa",
        street: "6 Arrowood Lane",
        unit: "",
        city: "Fairfax",
        zip: "94930"
    },
    {
        parentFirstName: "Heather",
        parentLastName: "Burns",
        title: "Clarissa Burns Parent",
        phone: "415-713-2371",
        school: "Oak Hill School",
        childFirstName: "Clarissa",
        childLastName: "Burns",
        street: "95 Bothin Road",
        unit: "",
        city: "Fairfax",
        zip: "94930"
    },
    {
        parentFirstName: "Heather",
        parentLastName: "Bell",
        title: "Violet Bell Parent",
        phone: "415-615-2319",
        school: "Archie Williams High School",
        childFirstName: "Violet",
        childLastName: "Bell",
        street: "18 Owlswood Drive",
        unit: "",
        city: "Larkspur",
        zip: ""
    },
    {
        parentFirstName: "Hector",
        parentLastName: "Lopez",
        title: "Alberth Lopez Contanza Parent",
        phone: "415-261-2437",
        school: "Davidson Middle School",
        childFirstName: "Alberth",
        childLastName: "Lopez Contanza",
        street: "1271 Valley Oak Court",
        unit: "",
        city: "Novato",
        zip: "94947"
    },
    {
        parentFirstName: "Hector",
        parentLastName: "Gutierrez",
        title: "Andrea/Isabel Gutierrez Parent",
        phone: "(415) 515-4467",
        school: "Redwood High School",
        childFirstName: "Andrea/Isabel",
        childLastName: "Gutierrez",
        street: "20 Pine Terrace",
        unit: "",
        city: "Belvedere",
        zip: ""
    },
    {
        parentFirstName: "Henry",
        parentLastName: "Hernandez",
        title: "Melanie Sontay Hernandez Parent",
        phone: "",
        school: "Hamilton School 3rd Grade",
        childFirstName: "Melanie",
        childLastName: "Sontay Hernandez",
        street: "119 Nova Albion Way ",
        unit: "311",
        city: "San Rafael",
        zip: "94901"
    },
    {
        parentFirstName: "Hongsoon",
        parentLastName: "Park",
        title: "Alek Park Parent",
        phone: "415-722-0860",
        school: "Hamilton School TK - 8",
        childFirstName: "Alek",
        childLastName: "Park",
        street: "290 Camino Alto Court",
        unit: "319",
        city: "Mill Valley",
        zip: "94949"
    },
    {
        parentFirstName: "Hubert",
        parentLastName: "McFarland",
        title: "Kaiden McFarland Parent",
        phone: "415-203-7005",
        school: "Lynwood School",
        childFirstName: "Kaiden",
        childLastName: "McFarland",
        street: "1320 Lynwood Drive",
        unit: "",
        city: "Novato",
        zip: "94947"
    },
    {
        parentFirstName: "Hugo",
        parentLastName: "Razo",
        title: "Eric Aguirre-Veliz Parent",
        phone: "",
        school: "Oak Hill School",
        childFirstName: "Eric",
        childLastName: "Aguirre-Veliz",
        street: "63 Live Oak Avenue",
        unit: "#9",
        city: "Fairfax",
        zip: "94901"
    },
    {
        parentFirstName: "Ingrid",
        parentLastName: "Castaneda Diaz",
        title: "Briani Castaneda Diaz Parent",
        phone: "415-448-1500",
        school: "Manor Elementary",
        childFirstName: "Briani",
        childLastName: "Castaneda Diaz",
        street: "1725 Marion Ave",
        unit: "H3",
        city: "Novato",
        zip: "94945"
    },
    {
        parentFirstName: "Iracema",
        parentLastName: "Lopez Contanza",
        title: "Alberth Lopez Contanza Parent",
        phone: "415-786-0904",
        school: "Davidson Middle School",
        childFirstName: "Alberth",
        childLastName: "Lopez Contanza",
        street: "1271 Valley Oak Court",
        unit: "",
        city: "Novato",
        zip: "94947"
    },
    {
        parentFirstName: "Issak",
        parentLastName: "Mwangi",
        title: "Mawangi Gabriel Munene Parent",
        phone: "415-299-1198",
        school: "The Helix School",
        childFirstName: "Mawangi Gabriel",
        childLastName: "Munene",
        street: "45 San Carlos Way",
        unit: "",
        city: "Novato",
        zip: ""
    }
];

async function runImport() {
    console.log("🚀 Starting Parent Data Import...\n");

    const client = new ConvexHttpClient(CONVEX_URL);

    try {
        // Step 1: Check readiness
        console.log("Step 1: Checking import readiness...");
        const readiness = await client.query("importParents:checkImportReadiness", {});
        console.log(`✓ Found ${readiness.totalChildren} children`);
        console.log(`✓ Currently ${readiness.childrenWithParents} children have parents`);
        console.log(`✓ Currently ${readiness.totalParents} parents in database\n`);

        // Step 2: Run import
        console.log(`Step 2: Importing ${PARENT_DATA.length} parent records...`);
        const results = await client.mutation("importParents:importParentsFromSheet", {
            rows: PARENT_DATA,
        });

        // Step 3: Display results
        console.log("\n✅ Import Complete!\n");
        console.log("Results:");
        console.log(`  📝 Parents Created: ${results.parentsCreated}`);
        console.log(`  🔄 Parents Updated: ${results.parentsUpdated}`);
        console.log(`  🔗 Relationships Created: ${results.relationshipsCreated}`);
        console.log(`  👶 Children Updated: ${results.childrenUpdated}`);
        console.log(`  ⚠️  Skipped: ${results.skipped.length}`);
        console.log(`  ❌ Errors: ${results.errors.length}`);

        if (results.skipped.length > 0) {
            console.log("\n⚠️  Skipped Records:");
            results.skipped.forEach((msg: string) => console.log(`  - ${msg}`));
        }

        if (results.errors.length > 0) {
            console.log("\n❌ Errors:");
            results.errors.forEach((msg: string) => console.log(`  - ${msg}`));
        }

        // Step 4: Verify
        console.log("\nStep 3: Verifying import...");
        const stats = await client.query("directory:getDirectoryStats", {});
        console.log(`✓ Total Parents: ${stats.parentsCount}`);
        console.log(`✓ Total Children: ${stats.childrenCount}`);
        console.log(`✓ Total Schools: ${stats.schoolsCount}`);
        console.log(`✓ Total Teachers: ${stats.teachersCount}\n`);

        console.log("🎉 Import successful!\n");

    } catch (error) {
        console.error("\n❌ Import failed:");
        console.error(error);
        process.exit(1);
    }
}

// Run the import
runImport();
