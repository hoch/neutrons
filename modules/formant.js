// https://www.classes.cs.uchicago.edu/archive/1999/spring/CS295/Computing_Resources/Csound/CsManual3.48b1.HTML/Appendices/table3.html
export const formant = {
    tenor: [
        [ // tenor "a"
            [650, 0, 80],
            [1080, -6, 90],
            [2650, -7, 120],
            [2900, -8, 130],
            [3250, -22, 140]
        ],
        [ // tenor "e"
            [400, 0, 70],
            [1700, -14, 80],
            [2600, -12, 100],
            [3200, -14, 120],
            [3580, -20, 120]
        ],
        [ // tenor "i"
            [290, 0, 40],
            [1870, -15, 90],
            [2800, -18, 100],
            [3250, -20, 120],
            [3540, -30, 120]
        ],
        [ // tenor "o"
            [400, 0, 40],
            [800, -10, 80],
            [2600, -12, 100],
            [2800, -12, 120],
            [3000, -26, 120]
        ],
        [ // tenor "u"
            [350, 0, 40],
            [600, -20, 60],
            [2700, -17, 100],
            [2900, -14, 120],
            [3300, -26, 120]
        ]
    ],
    bass: [
        [ // bass "a"
            [600, 0, 60],
            [1040, -7, 70],
            [2250, -9, 110],
            [2450, -9, 120],
            [2750, -20, 130]
        ],
        [ // bass "e"
            [400, 0, 40],
            [1620, -12, 80],
            [2400, -9, 100],
            [2800, -12, 120],
            [3100, -18, 120]
        ],
        [ // bass "i"
            [250, 0, 60],
            [1750, -30, 90],
            [2600, -16, 100],
            [3050, -22, 120],
            [3340, -28, 120]
        ],
        [ // bass "o"
            [400, 0, 40],
            [750, -11, 80],
            [2400, -21, 100],
            [2600, -20, 120],
            [2900, -40, 120]
        ],
        [ // bass "u"
            [350, 0, 40],
            [600, -20, 80],
            [2400, -32, 100],
            [2675, -28, 120],
            [2950, -36, 120]
        ]
    ]
};

export const formant_names = ["a", "e", "i", "o", "u"];