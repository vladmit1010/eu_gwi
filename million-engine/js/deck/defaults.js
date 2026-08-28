/** Default deck DATA (zeros). Edit structure here; client numbers come from Excel. */
export function createDefaultData() {
  return structuredClone(DEFAULT_DATA);
}

const DEFAULT_DATA = {
  "meta": {
    "title": "The Million Engine",
    "tagline": "Mastercard × Erste",
    "startYear": 2027,
    "source": ""
  },
  "masterLabels": [
    [
      "TARGET",
      "Target cards allocation (27'F)"
    ],
    [
      "CARDSHARE",
      "Share of total cards"
    ],
    [
      "MSHARE",
      "Market share"
    ],
    [
      "MPOT",
      "Market potential (27'F)"
    ],
    [
      "MAXACQ",
      "Max. acquisition"
    ],
    [
      "EXPACQ",
      "Expected acquisition (Y1)"
    ],
    [
      "TOTAL10",
      "Expected acquisition · 10 years"
    ]
  ],
  "passions": [
    {
      "id": "RUN",
      "label": "Running"
    },
    {
      "id": "F1",
      "label": "McLaren Mastercard F1"
    },
    {
      "id": "MUSLN",
      "label": "Music – Live Nation"
    },
    {
      "id": "MUSOT",
      "label": "Music – other"
    },
    {
      "id": "GAMMC",
      "label": "Gaming – MC assets"
    },
    {
      "id": "GAMOT",
      "label": "Gaming – other"
    }
  ],
  "countries": {
    "AT": {
      "name": "Austria",
      "master": {
        "TARGET": "0",
        "CARDSHARE": "0",
        "MSHARE": "0",
        "MPOT": "0",
        "MAXACQ": "0",
        "EXPACQ": "0",
        "TOTAL10": "0"
      },
      "passions": {
        "RUN": {
          "pp": [
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0"
          ],
          "headline": "AT_RUN_HEADLINE",
          "bullets": [
            "AT_RUN_BULLET1",
            "AT_RUN_BULLET2",
            "AT_RUN_BULLET3",
            "AT_RUN_BULLET4",
            "AT_RUN_BULLET5"
          ]
        },
        "F1": {
          "pp": [
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0"
          ],
          "headline": "AT_F1_HEADLINE",
          "bullets": [
            "AT_F1_BULLET1",
            "AT_F1_BULLET2",
            "AT_F1_BULLET3",
            "AT_F1_BULLET4",
            "AT_F1_BULLET5"
          ]
        },
        "MUSLN": {
          "pp": [
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0"
          ],
          "headline": "AT_MUSLN_HEADLINE",
          "bullets": [
            "AT_MUSLN_BULLET1",
            "AT_MUSLN_BULLET2",
            "AT_MUSLN_BULLET3",
            "AT_MUSLN_BULLET4",
            "AT_MUSLN_BULLET5"
          ]
        },
        "MUSOT": {
          "pp": [
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0"
          ],
          "headline": "AT_MUSOT_HEADLINE",
          "bullets": [
            "AT_MUSOT_BULLET1",
            "AT_MUSOT_BULLET2",
            "AT_MUSOT_BULLET3",
            "AT_MUSOT_BULLET4",
            "AT_MUSOT_BULLET5"
          ]
        },
        "GAMMC": {
          "pp": [
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0"
          ],
          "headline": "AT_GAMMC_HEADLINE",
          "bullets": [
            "AT_GAMMC_BULLET1",
            "AT_GAMMC_BULLET2",
            "AT_GAMMC_BULLET3",
            "AT_GAMMC_BULLET4",
            "AT_GAMMC_BULLET5"
          ]
        },
        "GAMOT": {
          "pp": [
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0"
          ],
          "headline": "AT_GAMOT_HEADLINE",
          "bullets": [
            "AT_GAMOT_BULLET1",
            "AT_GAMOT_BULLET2",
            "AT_GAMOT_BULLET3",
            "AT_GAMOT_BULLET4",
            "AT_GAMOT_BULLET5"
          ]
        }
      }
    },
    "PL": {
      "name": "Poland",
      "master": {
        "TARGET": "0",
        "CARDSHARE": "0",
        "MSHARE": "0",
        "MPOT": "0",
        "MAXACQ": "0",
        "EXPACQ": "0",
        "TOTAL10": "0"
      },
      "passions": {
        "RUN": {
          "pp": [
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0"
          ],
          "headline": "PL_RUN_HEADLINE",
          "bullets": [
            "PL_RUN_BULLET1",
            "PL_RUN_BULLET2",
            "PL_RUN_BULLET3",
            "PL_RUN_BULLET4",
            "PL_RUN_BULLET5"
          ]
        },
        "F1": {
          "pp": [
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0"
          ],
          "headline": "PL_F1_HEADLINE",
          "bullets": [
            "PL_F1_BULLET1",
            "PL_F1_BULLET2",
            "PL_F1_BULLET3",
            "PL_F1_BULLET4",
            "PL_F1_BULLET5"
          ]
        },
        "MUSLN": {
          "pp": [
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0"
          ],
          "headline": "PL_MUSLN_HEADLINE",
          "bullets": [
            "PL_MUSLN_BULLET1",
            "PL_MUSLN_BULLET2",
            "PL_MUSLN_BULLET3",
            "PL_MUSLN_BULLET4",
            "PL_MUSLN_BULLET5"
          ]
        },
        "MUSOT": {
          "pp": [
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0"
          ],
          "headline": "PL_MUSOT_HEADLINE",
          "bullets": [
            "PL_MUSOT_BULLET1",
            "PL_MUSOT_BULLET2",
            "PL_MUSOT_BULLET3",
            "PL_MUSOT_BULLET4",
            "PL_MUSOT_BULLET5"
          ]
        },
        "GAMMC": {
          "pp": [
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0"
          ],
          "headline": "PL_GAMMC_HEADLINE",
          "bullets": [
            "PL_GAMMC_BULLET1",
            "PL_GAMMC_BULLET2",
            "PL_GAMMC_BULLET3",
            "PL_GAMMC_BULLET4",
            "PL_GAMMC_BULLET5"
          ]
        },
        "GAMOT": {
          "pp": [
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0"
          ],
          "headline": "PL_GAMOT_HEADLINE",
          "bullets": [
            "PL_GAMOT_BULLET1",
            "PL_GAMOT_BULLET2",
            "PL_GAMOT_BULLET3",
            "PL_GAMOT_BULLET4",
            "PL_GAMOT_BULLET5"
          ]
        }
      }
    },
    "RO": {
      "name": "Romania",
      "master": {
        "TARGET": "0",
        "CARDSHARE": "0",
        "MSHARE": "0",
        "MPOT": "0",
        "MAXACQ": "0",
        "EXPACQ": "0",
        "TOTAL10": "0"
      },
      "passions": {
        "RUN": {
          "pp": [
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0"
          ],
          "headline": "RO_RUN_HEADLINE",
          "bullets": [
            "RO_RUN_BULLET1",
            "RO_RUN_BULLET2",
            "RO_RUN_BULLET3",
            "RO_RUN_BULLET4",
            "RO_RUN_BULLET5"
          ]
        },
        "F1": {
          "pp": [
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0"
          ],
          "headline": "RO_F1_HEADLINE",
          "bullets": [
            "RO_F1_BULLET1",
            "RO_F1_BULLET2",
            "RO_F1_BULLET3",
            "RO_F1_BULLET4",
            "RO_F1_BULLET5"
          ]
        },
        "MUSLN": {
          "pp": [
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0"
          ],
          "headline": "RO_MUSLN_HEADLINE",
          "bullets": [
            "RO_MUSLN_BULLET1",
            "RO_MUSLN_BULLET2",
            "RO_MUSLN_BULLET3",
            "RO_MUSLN_BULLET4",
            "RO_MUSLN_BULLET5"
          ]
        },
        "MUSOT": {
          "pp": [
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0"
          ],
          "headline": "RO_MUSOT_HEADLINE",
          "bullets": [
            "RO_MUSOT_BULLET1",
            "RO_MUSOT_BULLET2",
            "RO_MUSOT_BULLET3",
            "RO_MUSOT_BULLET4",
            "RO_MUSOT_BULLET5"
          ]
        },
        "GAMMC": {
          "pp": [
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0"
          ],
          "headline": "RO_GAMMC_HEADLINE",
          "bullets": [
            "RO_GAMMC_BULLET1",
            "RO_GAMMC_BULLET2",
            "RO_GAMMC_BULLET3",
            "RO_GAMMC_BULLET4",
            "RO_GAMMC_BULLET5"
          ]
        },
        "GAMOT": {
          "pp": [
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0"
          ],
          "headline": "RO_GAMOT_HEADLINE",
          "bullets": [
            "RO_GAMOT_BULLET1",
            "RO_GAMOT_BULLET2",
            "RO_GAMOT_BULLET3",
            "RO_GAMOT_BULLET4",
            "RO_GAMOT_BULLET5"
          ]
        }
      }
    },
    "CZ": {
      "name": "Czechia",
      "master": {
        "TARGET": "0",
        "CARDSHARE": "0",
        "MSHARE": "0",
        "MPOT": "0",
        "MAXACQ": "0",
        "EXPACQ": "0",
        "TOTAL10": "0"
      },
      "passions": {
        "RUN": {
          "pp": [
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0"
          ],
          "headline": "CZ_RUN_HEADLINE",
          "bullets": [
            "CZ_RUN_BULLET1",
            "CZ_RUN_BULLET2",
            "CZ_RUN_BULLET3",
            "CZ_RUN_BULLET4",
            "CZ_RUN_BULLET5"
          ]
        },
        "F1": {
          "pp": [
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0"
          ],
          "headline": "CZ_F1_HEADLINE",
          "bullets": [
            "CZ_F1_BULLET1",
            "CZ_F1_BULLET2",
            "CZ_F1_BULLET3",
            "CZ_F1_BULLET4",
            "CZ_F1_BULLET5"
          ]
        },
        "MUSLN": {
          "pp": [
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0"
          ],
          "headline": "CZ_MUSLN_HEADLINE",
          "bullets": [
            "CZ_MUSLN_BULLET1",
            "CZ_MUSLN_BULLET2",
            "CZ_MUSLN_BULLET3",
            "CZ_MUSLN_BULLET4",
            "CZ_MUSLN_BULLET5"
          ]
        },
        "MUSOT": {
          "pp": [
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0"
          ],
          "headline": "CZ_MUSOT_HEADLINE",
          "bullets": [
            "CZ_MUSOT_BULLET1",
            "CZ_MUSOT_BULLET2",
            "CZ_MUSOT_BULLET3",
            "CZ_MUSOT_BULLET4",
            "CZ_MUSOT_BULLET5"
          ]
        },
        "GAMMC": {
          "pp": [
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0"
          ],
          "headline": "CZ_GAMMC_HEADLINE",
          "bullets": [
            "CZ_GAMMC_BULLET1",
            "CZ_GAMMC_BULLET2",
            "CZ_GAMMC_BULLET3",
            "CZ_GAMMC_BULLET4",
            "CZ_GAMMC_BULLET5"
          ]
        },
        "GAMOT": {
          "pp": [
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0"
          ],
          "headline": "CZ_GAMOT_HEADLINE",
          "bullets": [
            "CZ_GAMOT_BULLET1",
            "CZ_GAMOT_BULLET2",
            "CZ_GAMOT_BULLET3",
            "CZ_GAMOT_BULLET4",
            "CZ_GAMOT_BULLET5"
          ]
        }
      }
    },
    "SK": {
      "name": "Slovakia",
      "master": {
        "TARGET": "0",
        "CARDSHARE": "0",
        "MSHARE": "0",
        "MPOT": "0",
        "MAXACQ": "0",
        "EXPACQ": "0",
        "TOTAL10": "0"
      },
      "passions": {
        "RUN": {
          "pp": [
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0"
          ],
          "headline": "SK_RUN_HEADLINE",
          "bullets": [
            "SK_RUN_BULLET1",
            "SK_RUN_BULLET2",
            "SK_RUN_BULLET3",
            "SK_RUN_BULLET4",
            "SK_RUN_BULLET5"
          ]
        },
        "F1": {
          "pp": [
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0"
          ],
          "headline": "SK_F1_HEADLINE",
          "bullets": [
            "SK_F1_BULLET1",
            "SK_F1_BULLET2",
            "SK_F1_BULLET3",
            "SK_F1_BULLET4",
            "SK_F1_BULLET5"
          ]
        },
        "MUSLN": {
          "pp": [
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0"
          ],
          "headline": "SK_MUSLN_HEADLINE",
          "bullets": [
            "SK_MUSLN_BULLET1",
            "SK_MUSLN_BULLET2",
            "SK_MUSLN_BULLET3",
            "SK_MUSLN_BULLET4",
            "SK_MUSLN_BULLET5"
          ]
        },
        "MUSOT": {
          "pp": [
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0"
          ],
          "headline": "SK_MUSOT_HEADLINE",
          "bullets": [
            "SK_MUSOT_BULLET1",
            "SK_MUSOT_BULLET2",
            "SK_MUSOT_BULLET3",
            "SK_MUSOT_BULLET4",
            "SK_MUSOT_BULLET5"
          ]
        },
        "GAMMC": {
          "pp": [
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0"
          ],
          "headline": "SK_GAMMC_HEADLINE",
          "bullets": [
            "SK_GAMMC_BULLET1",
            "SK_GAMMC_BULLET2",
            "SK_GAMMC_BULLET3",
            "SK_GAMMC_BULLET4",
            "SK_GAMMC_BULLET5"
          ]
        },
        "GAMOT": {
          "pp": [
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0"
          ],
          "headline": "SK_GAMOT_HEADLINE",
          "bullets": [
            "SK_GAMOT_BULLET1",
            "SK_GAMOT_BULLET2",
            "SK_GAMOT_BULLET3",
            "SK_GAMOT_BULLET4",
            "SK_GAMOT_BULLET5"
          ]
        }
      }
    },
    "HU": {
      "name": "Hungary",
      "master": {
        "TARGET": "0",
        "CARDSHARE": "0",
        "MSHARE": "0",
        "MPOT": "0",
        "MAXACQ": "0",
        "EXPACQ": "0",
        "TOTAL10": "0"
      },
      "passions": {
        "RUN": {
          "pp": [
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0"
          ],
          "headline": "HU_RUN_HEADLINE",
          "bullets": [
            "HU_RUN_BULLET1",
            "HU_RUN_BULLET2",
            "HU_RUN_BULLET3",
            "HU_RUN_BULLET4",
            "HU_RUN_BULLET5"
          ]
        },
        "F1": {
          "pp": [
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0"
          ],
          "headline": "HU_F1_HEADLINE",
          "bullets": [
            "HU_F1_BULLET1",
            "HU_F1_BULLET2",
            "HU_F1_BULLET3",
            "HU_F1_BULLET4",
            "HU_F1_BULLET5"
          ]
        },
        "MUSLN": {
          "pp": [
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0"
          ],
          "headline": "HU_MUSLN_HEADLINE",
          "bullets": [
            "HU_MUSLN_BULLET1",
            "HU_MUSLN_BULLET2",
            "HU_MUSLN_BULLET3",
            "HU_MUSLN_BULLET4",
            "HU_MUSLN_BULLET5"
          ]
        },
        "MUSOT": {
          "pp": [
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0"
          ],
          "headline": "HU_MUSOT_HEADLINE",
          "bullets": [
            "HU_MUSOT_BULLET1",
            "HU_MUSOT_BULLET2",
            "HU_MUSOT_BULLET3",
            "HU_MUSOT_BULLET4",
            "HU_MUSOT_BULLET5"
          ]
        },
        "GAMMC": {
          "pp": [
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0"
          ],
          "headline": "HU_GAMMC_HEADLINE",
          "bullets": [
            "HU_GAMMC_BULLET1",
            "HU_GAMMC_BULLET2",
            "HU_GAMMC_BULLET3",
            "HU_GAMMC_BULLET4",
            "HU_GAMMC_BULLET5"
          ]
        },
        "GAMOT": {
          "pp": [
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0"
          ],
          "headline": "HU_GAMOT_HEADLINE",
          "bullets": [
            "HU_GAMOT_BULLET1",
            "HU_GAMOT_BULLET2",
            "HU_GAMOT_BULLET3",
            "HU_GAMOT_BULLET4",
            "HU_GAMOT_BULLET5"
          ]
        }
      }
    },
    "HR": {
      "name": "Croatia",
      "master": {
        "TARGET": "0",
        "CARDSHARE": "0",
        "MSHARE": "0",
        "MPOT": "0",
        "MAXACQ": "0",
        "EXPACQ": "0",
        "TOTAL10": "0"
      },
      "passions": {
        "RUN": {
          "pp": [
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0"
          ],
          "headline": "HR_RUN_HEADLINE",
          "bullets": [
            "HR_RUN_BULLET1",
            "HR_RUN_BULLET2",
            "HR_RUN_BULLET3",
            "HR_RUN_BULLET4",
            "HR_RUN_BULLET5"
          ]
        },
        "F1": {
          "pp": [
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0"
          ],
          "headline": "HR_F1_HEADLINE",
          "bullets": [
            "HR_F1_BULLET1",
            "HR_F1_BULLET2",
            "HR_F1_BULLET3",
            "HR_F1_BULLET4",
            "HR_F1_BULLET5"
          ]
        },
        "MUSLN": {
          "pp": [
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0"
          ],
          "headline": "HR_MUSLN_HEADLINE",
          "bullets": [
            "HR_MUSLN_BULLET1",
            "HR_MUSLN_BULLET2",
            "HR_MUSLN_BULLET3",
            "HR_MUSLN_BULLET4",
            "HR_MUSLN_BULLET5"
          ]
        },
        "MUSOT": {
          "pp": [
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0"
          ],
          "headline": "HR_MUSOT_HEADLINE",
          "bullets": [
            "HR_MUSOT_BULLET1",
            "HR_MUSOT_BULLET2",
            "HR_MUSOT_BULLET3",
            "HR_MUSOT_BULLET4",
            "HR_MUSOT_BULLET5"
          ]
        },
        "GAMMC": {
          "pp": [
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0"
          ],
          "headline": "HR_GAMMC_HEADLINE",
          "bullets": [
            "HR_GAMMC_BULLET1",
            "HR_GAMMC_BULLET2",
            "HR_GAMMC_BULLET3",
            "HR_GAMMC_BULLET4",
            "HR_GAMMC_BULLET5"
          ]
        },
        "GAMOT": {
          "pp": [
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0"
          ],
          "headline": "HR_GAMOT_HEADLINE",
          "bullets": [
            "HR_GAMOT_BULLET1",
            "HR_GAMOT_BULLET2",
            "HR_GAMOT_BULLET3",
            "HR_GAMOT_BULLET4",
            "HR_GAMOT_BULLET5"
          ]
        }
      }
    },
    "RS": {
      "name": "Serbia",
      "master": {
        "TARGET": "0",
        "CARDSHARE": "0",
        "MSHARE": "0",
        "MPOT": "0",
        "MAXACQ": "0",
        "EXPACQ": "0",
        "TOTAL10": "0"
      },
      "passions": {
        "RUN": {
          "pp": [
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0"
          ],
          "headline": "RS_RUN_HEADLINE",
          "bullets": [
            "RS_RUN_BULLET1",
            "RS_RUN_BULLET2",
            "RS_RUN_BULLET3",
            "RS_RUN_BULLET4",
            "RS_RUN_BULLET5"
          ]
        },
        "F1": {
          "pp": [
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0"
          ],
          "headline": "RS_F1_HEADLINE",
          "bullets": [
            "RS_F1_BULLET1",
            "RS_F1_BULLET2",
            "RS_F1_BULLET3",
            "RS_F1_BULLET4",
            "RS_F1_BULLET5"
          ]
        },
        "MUSLN": {
          "pp": [
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0"
          ],
          "headline": "RS_MUSLN_HEADLINE",
          "bullets": [
            "RS_MUSLN_BULLET1",
            "RS_MUSLN_BULLET2",
            "RS_MUSLN_BULLET3",
            "RS_MUSLN_BULLET4",
            "RS_MUSLN_BULLET5"
          ]
        },
        "MUSOT": {
          "pp": [
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0"
          ],
          "headline": "RS_MUSOT_HEADLINE",
          "bullets": [
            "RS_MUSOT_BULLET1",
            "RS_MUSOT_BULLET2",
            "RS_MUSOT_BULLET3",
            "RS_MUSOT_BULLET4",
            "RS_MUSOT_BULLET5"
          ]
        },
        "GAMMC": {
          "pp": [
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0"
          ],
          "headline": "RS_GAMMC_HEADLINE",
          "bullets": [
            "RS_GAMMC_BULLET1",
            "RS_GAMMC_BULLET2",
            "RS_GAMMC_BULLET3",
            "RS_GAMMC_BULLET4",
            "RS_GAMMC_BULLET5"
          ]
        },
        "GAMOT": {
          "pp": [
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0"
          ],
          "headline": "RS_GAMOT_HEADLINE",
          "bullets": [
            "RS_GAMOT_BULLET1",
            "RS_GAMOT_BULLET2",
            "RS_GAMOT_BULLET3",
            "RS_GAMOT_BULLET4",
            "RS_GAMOT_BULLET5"
          ]
        }
      }
    }
  }
};
