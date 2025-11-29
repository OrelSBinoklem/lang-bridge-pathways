import React from 'react';
import VerbConjugationBase from './VerbConjugationBase';

/**
 * КАТЕГОРИЯ 2: Таблица спряжений глаголов (вторая группа)
 * 
 * Использует базовый компонент VerbConjugationBase
 * Содержит глаголы из строк 344-1072
 */
const VerbConjugationCategory2 = (props) => {
  // Объект с глаголами и их спряжениями для второй категории
  const verbs = {
    //B1
    'celt': {
      name: 'celt - поднимать',
      'es_past': 'cēlu',
      'es_present': 'ceļu',
      'es_future': 'celšu',
      'tu_past': 'cēli',
      'tu_present': 'ceļ',
      'tu_future': 'celsi',
      '3pers_past': 'cēla',
      '3pers_present': 'ceļ',
      '3pers_future': 'cels',
      'we_past': 'cēlām',
      'we_present': 'ceļam',
      'we_future': 'celsim',
      'you_pl_past': 'cēlāt',
      'you_pl_present': 'ceļat',
      'you_pl_future': 'celsiet',
    },
    'gūt': {
      name: 'gūt - получать, обрести',
      'es_past': 'guvu',
      'es_present': 'gūstu',
      'es_future': 'gūšu',
      'tu_past': 'guvi',
      'tu_present': 'gūsti',
      'tu_future': 'gūsi',
      '3pers_past': 'guva',
      '3pers_present': 'gūst',
      '3pers_future': 'gūs',
      'we_past': 'guvām',
      'we_present': 'gūstam',
      'we_future': 'gūsim',
      'you_pl_past': 'guvāt',
      'you_pl_present': 'gūstat',
      'you_pl_future': 'gūsiet',
    },
    'kļūt': {
      name: 'kļūt - становиться',
      'es_past': 'kļuvu',
      'es_present': 'kļūstu',
      'es_future': 'kļūšu',
      'tu_past': 'kļuvi',
      'tu_present': 'kļūsti',
      'tu_future': 'kļūsi',
      '3pers_past': 'kļuva',
      '3pers_present': 'kļūst',
      '3pers_future': 'kļūs',
      'we_past': 'kļuvām',
      'we_present': 'kļūstam',
      'we_future': 'kļūsim',
      'you_pl_past': 'kļuvāt',
      'you_pl_present': 'kļūstat',
      'you_pl_future': 'kļūsiet',
    },
    'just': {
      name: 'just - чувствовать',
      'es_past': 'jutu',
      'es_present': 'jūtu',
      'es_future': 'jutīšu',
      'tu_past': 'juti',
      'tu_present': 'jūti',
      'tu_future': 'jutīsi',
      '3pers_past': 'juta',
      '3pers_present': 'jūt',
      '3pers_future': 'jutīs',
      'we_past': 'jutām',
      'we_present': 'jūtam',
      'we_future': 'jutīsim',
      'you_pl_past': 'jutāt',
      'you_pl_present': 'jūtat',
      'you_pl_future': 'jutīsiet',
    },

    "vest": {
      name: "vest - везти",
      "es_past": "vedu",
      "es_present": "vedu",
      "es_future": "vedīšu",
      "tu_past": "vedi",
      "tu_present": "ved",
      "tu_future": "vedīsi",
      "3pers_past": "veda",
      "3pers_present": "ved",
      "3pers_future": "vedīs",
      "we_past": "vedām",
      "we_present": "vedam",
      "we_future": "vedīsim",
      "you_pl_past": "vedāt",
      "you_pl_present": "vedat",
      "you_pl_future": "vedīsiet"
    },

    "mest": {
      name: "mest - бросать",
      "es_past": "metu",
      "es_present": "metu",
      "es_future": "metīšu",
      "tu_past": "meti",
      "tu_present": "met",
      "tu_future": "metīsi",
      "3pers_past": "meta",
      "3pers_present": "met",
      "3pers_future": "metīs",
      "we_past": "metām",
      "we_present": "metam",
      "we_future": "metīsim",
      "you_pl_past": "metāt",
      "you_pl_present": "metat",
      "you_pl_future": "metīsiet"
    },

    "zust": {
      name: "zust - исчезать",
      "es_past": "-",
      "es_present": "-",
      "es_future": "-",
      "tu_past": "-",
      "tu_present": "-",
      "tu_future": "-",
      "3pers_past": "zuda",
      "3pers_present": "zūd",
      "3pers_future": "zudīs",
      "we_past": "-",
      "we_present": "-",
      "we_future": "-",
      "you_pl_past": "-",
      "you_pl_present": "-",
      "you_pl_future": "-"
    },

    //B2

    'zagt': {
      name: 'zagt - воровать',
      'es_past': 'zagu',
      'es_present': 'zogu',
      'es_future': 'zagšu',
      'tu_past': 'zagi',
      'tu_present': 'zodz',
      'tu_future': 'zagsi',
      '3pers_past': 'zaga',
      '3pers_present': 'zog',
      '3pers_future': 'zags',
      'we_past': 'zagām',
      'we_present': 'zogam',
      'we_future': 'zagsim',
      'you_pl_past': 'zagāt',
      'you_pl_present': 'zogat',
      'you_pl_future': 'zagsiet',
    },


    'krist': {
      name: 'krist - падать',
      'es_past': 'kritu',
      'es_present': 'krītu',
      'es_future': 'kritīšu',
      'tu_past': 'kriti',
      'tu_present': 'krīti',
      'tu_future': 'kritīsi',
      '3pers_past': 'krita',
      '3pers_present': 'krīt',
      '3pers_future': 'kritīs',
      'we_past': 'kritām',
      'we_present': 'krītam',
      'we_future': 'kritīsim',
      'you_pl_past': 'kritāt',
      'you_pl_present': 'krītat',
      'you_pl_future': 'kritīsiet',
    },





    // ✅ laist по Letonika
    'laist': {
      name: 'laist - пускать, отпускать',
      'es_past': 'laidu',
      'es_present': 'laižu',
      'es_future': 'laidīšu',
      'tu_past': 'laidi',
      'tu_present': 'laid',
      'tu_future': 'laidīsi',
      '3pers_past': 'laida',
      '3pers_present': 'laiž',
      '3pers_future': 'laidīs',
      'we_past': 'laidām',
      'we_present': 'laižam',
      'we_future': 'laidīsim',
      'you_pl_past': 'laidāt',
      'you_pl_present': 'laižat',
      'you_pl_future': 'laidīsiet',
    },

    // ✅ kliegt по Letonika
    'kliegt': {
      name: 'kliegt - кричать',
      'es_past': 'kliedzu',
      'es_present': 'kliedzu',
      'es_future': 'kliegšu',
      'tu_past': 'kliedzi',
      'tu_present': 'kliedz',
      'tu_future': 'kliegsi',
      '3pers_past': 'kliedza',
      '3pers_present': 'kliedz',
      '3pers_future': 'kliegs',
      'we_past': 'kliedzām',
      'we_present': 'kliedzam',
      'we_future': 'kliegsim',
      'you_pl_past': 'kliedzāt',
      'you_pl_present': 'kliedzat',
      'you_pl_future': 'kliegsiet',
    },




    'sēdēt': {
      name: 'sēdēt - сидеть',
      'es_past': 'sēdēju',
      'es_present': 'sēžu',
      'es_future': 'sēdēšu',
      'tu_past': 'sēdēji',
      'tu_present': 'sēdi',
      'tu_future': 'sēdēsi',
      '3pers_past': 'sēdēja',
      '3pers_present': 'sēž',
      '3pers_future': 'sēdēs',
      'we_past': 'sēdējām',
      'we_present': 'sēžam',
      'we_future': 'sēdēsim',
      'you_pl_past': 'sēdējāt',
      'you_pl_present': 'sēžat',
      'you_pl_future': 'sēdēsiet',
    },



    'dzīt': {
      name: 'dzīt - гнать',
      'es_past': 'dzinu',
      'es_present': 'dzenu',
      'es_future': 'dzīšu',
      'tu_past': 'dzini',
      'tu_present': 'dzen',
      'tu_future': 'dzīsi',
      '3pers_past': 'dzina',
      '3pers_present': 'dzen',
      '3pers_future': 'dzīs',
      'we_past': 'dzinām',
      'we_present': 'dzenam',
      'we_future': 'dzīsim',
      'you_pl_past': 'dzināt',
      'you_pl_present': 'dzenat',
      'you_pl_future': 'dzīsiet',
    },





    "kost": {
      name: "kost - кусать",
      "es_past": "kodu",
      "es_present": "kožu",
      "es_future": "košu",
      "tu_past": "kodi",
      "tu_present": "kož",
      "tu_future": "kosi",
      "3pers_past": "koda",
      "3pers_present": "kož",
      "3pers_future": "kos",
      "we_past": "kodām",
      "we_present": "kožam",
      "we_future": "kosim",
      "you_pl_past": "kodāt",
      "you_pl_present": "kožat",
      "you_pl_future": "kosiet"
    },

    "raut": {
      name: "raut - рвать, дёргать",
      "es_past": "rāvu",
      "es_present": "rauju",
      "es_future": "raušu",
      "tu_past": "rāvi",
      "tu_present": "rauj",
      "tu_future": "rausi",
      "3pers_past": "rāva",
      "3pers_present": "rauj",
      "3pers_future": "raus",
      "we_past": "rāvām",
      "we_present": "raujam",
      "we_future": "rausim",
      "you_pl_past": "rāvāt",
      "you_pl_present": "raujat",
      "you_pl_future": "rausiet"
    },







    "plest": {
      name: "plest - раскрывать, рвать",
      "es_past": "plēsu",
      "es_present": "plešu",
      "es_future": "plēsīšu",
      "tu_past": "plēsi",
      "tu_present": "plēs",
      "tu_future": "plēsīsi",
      "3pers_past": "plēsa",
      "3pers_present": "plēs",
      "3pers_future": "plēsīs",
      "we_past": "plēsām",
      "we_present": "plešam",
      "we_future": "plēsīsim",
      "you_pl_past": "plēsāt",
      "you_pl_present": "plešat",
      "you_pl_future": "plēsīsiet"
    },

    "liegt": {
      name: "liegt - запрещать",
      "es_past": "liedzu",
      "es_present": "liedzu",
      //"es_future": "liegšu",
      //"tu_past": "liedzi",
      //"tu_present": "liedz",
      //"tu_future": "liegsi",
      //"3pers_past": "liedza",
      //"3pers_present": "liedz",
      //"3pers_future": "liegs",
      //"we_past": "liedzām",
      //"we_present": "liedzam",
      //"we_future": "liegsim",
      //"you_pl_past": "liedzāt",
      //"you_pl_present": "liedzat",
      //"you_pl_future": "liegsiet"
    },



    "spiest": {
      name: "spiest - нажимать",
      "es_past": "spiedu",
      "es_present": "spiežu",
      "es_future": "spiedīšu",
      //"tu_past": "spiedi",
      "tu_present": "spiedz",
      //"tu_future": "spiedīsi",
      //"3pers_past": "spieda",
      "3pers_present": "spiež",
      //"3pers_future": "spiedīs",
      //"we_past": "spiedām",
      "we_present": "spiežam",
      //"we_future": "spiedīsim",
      //"you_pl_past": "spiedāt",
      "you_pl_present": "spiežat",
      //"you_pl_future": "spiedīsiet"
    },

    "snigt": {
      "name": "snigt - идти (о снеге)",
      "3pers_past": "sniga",
      "3pers_present": "snieg",
      "3pers_future": "snigs",
    },

    "rasties": {
      "name": "rasties - возникать",
      "es_past": "rados",
      "es_present": "rodos",
      "es_future": "radīšos",

      //"tu_past": "radies",
      "tu_present": "rodies",
      //"tu_future": "radīsies",

      //"3pers_past": "radās",
      "3pers_present": "rodas",
      //"3pers_future": "radīsies",

      //"we_past": "radāmies",
      "we_present": "radāmies",
      //"we_future": "radīsimies",

      //"you_pl_past": "radāties",
      "you_pl_present": "radāties",
      //"you_pl_future": "radīsieties"
    }
  };

  return <VerbConjugationBase verbs={verbs} {...props} />;
};

export default VerbConjugationCategory2;

