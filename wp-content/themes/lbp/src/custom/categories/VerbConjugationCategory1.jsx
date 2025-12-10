import React from 'react';
import VerbConjugationBase from './VerbConjugationBase';

/**
 * КАТЕГОРИЯ 1: Таблица спряжений глаголов (первая группа)
 * 
 * Использует базовый компонент VerbConjugationBase
 * Содержит глаголы из строк 159-338
 */
const VerbConjugationCategory1 = (props) => {
  // Объект с глаголами и их спряжениями для первой категории
  const verbs = {
    /*A2*/


    'satikt': {//+
      name: 'satikt - встретить',

      'es_past': 'satiku',
      'es_present': 'satieku',
      'es_future': 'satikšu',

      'tu_past': 'satiki',
      'tu_present': 'satiec',
      'tu_future': 'satiksi',

      '3pers_past': 'satika',
      '3pers_present': 'satiek',
      '3pers_future': 'satiks',

      'we_past': 'satikām',
      'we_present': 'satiekam',
      'we_future': 'satiksim',

      'you_pl_past': 'satikāt',
      'you_pl_present': 'satiekat',
      'you_pl_future': 'satiksiet',
    },
    'nākt': {//+
      name: 'nākt - приходить',

      'es_past': 'nācu',
      'es_present': 'nāku',
      'es_future': 'nākšu',

      'tu_past': 'nāci',
      'tu_present': 'nāc',
      'tu_future': 'nāksi',

      '3pers_past': 'nāca',
      '3pers_present': 'nāk',
      '3pers_future': 'nāks',

      'we_past': 'nācām',
      'we_present': 'nākam',
      'we_future': 'nāksim',

      'you_pl_past': 'nācāt',
      'you_pl_present': 'nākat',
      'you_pl_future': 'nāksiet',
    },
    'ņemt': {//+
      name: 'ņemt - брать',

      'es_past': 'ņēmu',
      'es_present': 'ņemu',
      'es_future': 'ņemšu',

      'tu_past': 'ņēmi',
      'tu_present': 'ņem',
      'tu_future': 'ņemsi',

      '3pers_past': 'ņēma',
      '3pers_present': 'ņem',
      '3pers_future': 'ņems',

      'we_past': 'ņēmām',
      'we_present': 'ņemam',
      'we_future': 'ņemsim',

      'you_pl_past': 'ņēmāt',
      'you_pl_present': 'ņemat',
      'you_pl_future': 'ņemsiet',
    },

    'prast': {//+
      name: 'prast - уметь',

      'es_past': 'pratu',
      'es_present': 'protu',
      'es_future': 'pratīšu',

      'tu_past': 'prati',
      'tu_present': 'proti',
      'tu_future': 'pratīsi',

      '3pers_past': 'prata',
      '3pers_present': 'prot',
      '3pers_future': 'pratīs',

      'we_past': 'pratām',
      'we_present': 'protam',
      'we_future': 'pratīsim',

      'you_pl_past': 'pratāt',
      'you_pl_present': 'protat',
      'you_pl_future': 'pratīsiet',
    },
    'doties': {//+
      name: 'doties - направляться',

      'es_past': 'devos',
      'es_present': 'dodos',
      'es_future': 'došos',

      'tu_past': 'devies',
      'tu_present': 'dodies',
      'tu_future': 'dosies',

      '3pers_past': 'devās',
      '3pers_present': 'dodas',
      '3pers_future': 'dosies',

      'we_past': 'devāmies',
      'we_present': 'dodamies',
      'we_future': 'dosimies',

      'you_pl_past': 'devāties',
      'you_pl_present': 'dodaties',
      'you_pl_future': 'dosieties',
    },
    'beigties': {//+
      name: 'beigties - (за)кончиться',

      'es_past': 'beidzos',
      'es_present': 'beidzos',
      'es_future': 'beigšos',

      'tu_past': 'beidzies',
      'tu_present': 'beidzies',
      'tu_future': 'beigsies',

      '3pers_past': 'beidzās',
      '3pers_present': 'beidzas',
      '3pers_future': 'beigsies',

      'we_past': 'beidzāmies',
      'we_present': 'beidzamies',
      'we_future': 'beigsimies',

      'you_pl_past': 'beidzāties',
      'you_pl_present': 'beidzaties',
      'you_pl_future': 'beigsieties',
    },
    'sākties': {//+
      name: 'sākties - начаться',

      'es_past': 'sākos',
      'es_present': 'sākos',
      'es_future': 'sākšos',

      'tu_past': 'sākies',
      'tu_present': 'sācies',
      'tu_future': 'sāksies',

      '3pers_past': 'sākās',
      '3pers_present': 'sākas',
      '3pers_future': 'sāksies',

      'we_past': 'sākāmies',
      'we_present': 'sākamies',
      'we_future': 'sākšimies',

      'you_pl_past': 'sākāties',
      'you_pl_present': 'sākaties',
      'you_pl_future': 'sāksieties',
    },
    'lūgt': {//+
      name: 'lūgt - просить (пригласить)',

      'es_past': 'lūdzu',
      'es_present': 'lūdzu',
      'es_future': 'lūgšu',

      'tu_past': 'lūdzi',
      'tu_present': 'lūdz',
      'tu_future': 'lūgsi',

      '3pers_past': 'lūdza',
      '3pers_present': 'lūdz',
      '3pers_future': 'lūgs',

      'we_past': 'lūdzām',
      'we_present': 'lūdzam',
      'we_future': 'lūgsim',

      'you_pl_past': 'lūdzāt',
      'you_pl_present': 'lūdzat',
      'you_pl_future': 'lūgsiet',
    },
    'atrasties': {//+
      name: 'atrasties - находиться',

      'es_past': 'atrados',
      'es_present': 'atrodos',
      'es_future': 'atradīšos',

      'tu_past': 'atradies',
      'tu_present': 'atrodies',
      'tu_future': 'atradīsies',

      '3pers_past': 'atradās',
      '3pers_present': 'atrodas',
      '3pers_future': 'atradīsies',

      'we_past': 'atradāmies',
      'we_present': 'atrodamies',
      'we_future': 'atradīsimies',

      'you_pl_past': 'atradāties',
      'you_pl_present': 'atrodaties',
      'you_pl_future': 'atradīsieties',
    },
    'dot': {
      name: 'dot - давать',

      'es_past': 'devu',
      'es_present': 'dodu',
      'es_future': 'došu',

      'tu_past': 'devi',
      'tu_present': 'dod',
      'tu_future': 'dosi',

      '3pers_past': 'deva',
      '3pers_present': 'dod',
      '3pers_future': 'dos',

      'we_past': 'devām',
      'we_present': 'dodam',
      'we_future': 'dosim',

      'you_pl_past': 'devāt',
      'you_pl_present': 'dodat',
      'you_pl_future': 'dosiet',
    },
    'likt': {//+
      name: 'likt - класть, ставить',

      'es_past': 'liku',
      'es_present': 'lieku',
      'es_future': 'likšu',

      'tu_past': 'liki',
      'tu_present': 'liec',
      'tu_future': 'liksi',

      '3pers_past': 'lika',
      '3pers_present': 'liek',
      '3pers_future': 'liks',

      'we_past': 'likām',
      'we_present': 'liekam',
      'we_future': 'liksim',

      'you_pl_past': 'likāt',
      'you_pl_present': 'liekat',
      'you_pl_future': 'liksiet',
    },
    'tikt': {//+
      name: 'tikt - попасть, стать',

      'es_past': 'tiku',
      'es_present': 'tieku',
      'es_future': 'tikšu',

      'tu_past': 'tiki',
      'tu_present': 'tiec',
      'tu_future': 'tiksi',

      '3pers_past': 'tika',
      '3pers_present': 'tiek',
      '3pers_future': 'tiks',

      'we_past': 'tikām',
      'we_present': 'tiekam',
      'we_future': 'tiksim',

      'you_pl_past': 'tikāt',
      'you_pl_present': 'tiekat',
      'you_pl_future': 'tiksiet',
    },
    // ✅ saukt по Letonika
    'saukt': {//+
      name: 'saukt - звать, называть',

      'es_past': 'saucu',
      'es_present': 'saucu',
      'es_future': 'saukšu',

      'tu_past': 'sauci',
      'tu_present': 'sauc',
      'tu_future': 'sauksi',

      '3pers_past': 'sauca',
      '3pers_present': 'sauc',
      '3pers_future': 'sauks',

      'we_past': 'saucām',
      'we_present': 'saucam',
      'we_future': 'sauksim',

      'you_pl_past': 'saucāt',
      'you_pl_present': 'saucat',
      'you_pl_future': 'sauksiet',
    },
    // teikt – с чередованием k→c и teikš- в будущем
    'teikt': {//+
      name: 'teikt - говорить, сказать',

      'es_past': 'teicu',
      'es_present': 'teicu',
      'es_future': 'teikšu',

      'tu_past': 'teici',
      'tu_present': 'teic',
      'tu_future': 'teiksi',

      '3pers_past': 'teica',
      '3pers_present': 'teic',
      '3pers_future': 'teiks',

      'we_past': 'teicām',
      'we_present': 'teicam',
      'we_future': 'teiksim',

      'you_pl_past': 'teicāt',
      'you_pl_present': 'teicat',
      'you_pl_future': 'teiksiet',
    },
    'vilkt': {//+
      name: 'vilkt - тянуть, носить',

      'es_past': 'vilku',
      'es_present': 'velku',
      'es_future': 'vilkšu',

      'tu_past': 'vilki',
      'tu_present': 'velc',
      'tu_future': 'vilksi',

      '3pers_past': 'vilka',
      '3pers_present': 'velk',
      '3pers_future': 'vilks',

      'we_past': 'vilkām',
      'we_present': 'velkam',
      'we_future': 'vilksim',

      'you_pl_past': 'vilkāt',
      'you_pl_present': 'velkat',
      'you_pl_future': 'vilksiet',
    },
    "nest": {//+
      name: "nest - нести",

      "es_past": "nesu",
      "es_present": "nesu",
      "es_future": "nesīšu",

      "tu_past": "nesi",
      "tu_present": "nes",
      "tu_future": "nesīsi",

      "3pers_past": "nesa",
      "3pers_present": "nes",
      "3pers_future": "nesīs",

      "we_past": "nesām",
      "we_present": "nesam",
      "we_future": "nesīsim",

      "you_pl_past": "nesāt",
      "you_pl_present": "nesat",
      "you_pl_future": "nesīsiet"
    },
    "sniegt": {//+
      name: "sniegt - подавать",

      "es_past": "sniedzu",
      "es_present": "sniedzu",
      "es_future": "sniegšu",

      "tu_past": "sniedzi",
      "tu_present": "sniedz",
      "tu_future": "sniegsi",

      "3pers_past": "sniedza",
      "3pers_present": "sniedz",
      "3pers_future": "sniegs",

      "we_past": "sniedzām",
      "we_present": "sniedzam",
      "we_future": "sniegsim",

      "you_pl_past": "sniedzāt",
      "you_pl_present": "sniedzat",
      "you_pl_future": "sniegsiet"
    },
  };

  return <VerbConjugationBase verbs={verbs} {...props} />;
};

export default VerbConjugationCategory1;

