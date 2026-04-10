GENDER_MAP = {
    0: "Male",
    1: "Female",
    2: "Non-binary / Other",
}

HAIR_TYPE_MAP = {
    0: "No hair",
    1: "Short",
    2: "Long",
}

EYE_COLOR_CODE_MAP = {
    0: "Blue",
    1: "Brown",
    2: "Green",
    3: "Grey",
}

BLOOD_TYPE_MAP = {
    1: "A+",
    2: "A-",
    3: "B+",
    4: "B-",
    5: "0+",
    6: "0-",
    7: "AB+",
    8: "AB-",
}

EXACT_COLOR_MAP = {
    (230, 230, 230): "white",
    (227, 227, 227): "white",
    (224, 224, 224): "white",
    (231, 231, 231): "white",
    (3, 2, 2): "black",
    (5, 5, 5): "black",
    (11, 10, 10): "black",
    (12, 11, 11): "black",
    (14, 13, 13): "black",
    (15, 14, 14): "black",
    (19, 18, 17): "black",
    (21, 20, 20): "black",
    (22, 21, 21): "black",
    (24, 23, 23): "black",
    (101, 101, 101): "gray",
    (115, 115, 115): "gray",
    (117, 117, 117): "gray",
    (134, 134, 134): "gray",
    (152, 127, 77): "ginger",
    (158, 132, 79): "ginger",
}

COLOR_RANGES = {
    "black": {
        "r": (0, 35),
        "g": (0, 35),
        "b": (0, 35),
    },
    "white": {
        "r": (190, 255),
        "g": (190, 255),
        "b": (190, 255),
    },
    "gray": {
        "r": (90, 180),
        "g": (90, 180),
        "b": (90, 180),
        "max_diff": 15,
    },
    "brown": {
        "r": (60, 170),
        "g": (30, 110),
        "b": (0, 80),
    },
    "blonde": {
        "r": (170, 255),
        "g": (140, 240),
        "b": (0, 140),
    },
    "ginger": {
        "r": (140, 255),
        "g": (70, 160),
        "b": (0, 90),
    },
    "red": {
        "r": (110, 255),
        "g": (0, 100),
        "b": (0, 100),
    },
    "pink": {
        "r": (180, 255),
        "g": (80, 220),
        "b": (120, 255),
        "rb_diff_max": 90,
    },
    "purple": {
        "r": (90, 200),
        "g": (0, 140),
        "b": (90, 255),
    },
}

COLOR_CLASSIFICATION_MODE = "hybrid"  # hybrid | exact_only | ranges_only
COLOR_CLASSIFICATION_PRIORITY = ["exact", "ranges"]
