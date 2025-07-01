import spacy
import os
import joblib
import re
import numpy as np
from typing import Dict, Any, Optional, List, Tuple, Union
from datetime import date, timedelta
from sklearn.preprocessing import MultiLabelBinarizer


PROCESSOR_DIR = os.path.dirname(__file__)
STYLE_MODEL_PATH = os.path.join(PROCESSOR_DIR, "travel_style_model.pkl")
INTEREST_MODEL_PATH = os.path.join(PROCESSOR_DIR, "interest_classifier_model.pkl")
INTEREST_BINARIZER_PATH = os.path.join(PROCESSOR_DIR, "interest_label_binarizer.pkl")

INTEREST_PREDICTION_THRESHOLD = 0.2


nlp = None
try:
    print("Loading spaCy Russian model...")
    nlp = spacy.load("ru_core_news_sm")
    print("spaCy model loaded.")
except OSError:
    print("SpaCy Russian model not found. Downloading...")
    try:
        spacy.cli.download("ru_core_news_sm")
        nlp = spacy.load("ru_core_news_sm")
        print("SpaCy model downloaded and loaded.")
    except Exception as e:
        print(f"Error downloading/loading spaCy model: {e}")

nlp_lemmatizer = None
try:
    print("Loading spaCy Russian model for lemmatization...")
    nlp_lemmatizer = spacy.load("ru_core_news_sm", disable=["parser", "ner", "textcat", "senter"])
    print("SpaCy model loaded for lemmatization.")
    if 'lemmatizer' not in nlp_lemmatizer.pipe_names:
        print("Warning: 'lemmatizer' component not found in the loaded spaCy model. Lemmatization may not work correctly.")
except OSError:
    print("SpaCy Russian model not found for lemmatization. Downloading...")
    try:
        spacy.cli.download("ru_core_news_sm")
        nlp_lemmatizer = spacy.load("ru_core_news_sm", disable=["parser", "ner", "textcat", "senter"])
        print("SpaCy model downloaded and loaded for lemmatization.")
        if 'lemmatizer' not in nlp_lemmatizer.pipe_names:
             print("Warning: 'lemmatizer' component not found after download and load.")
    except Exception as e:
        print(f"Error downloading/loading spaCy model for lemmatization: {e}")
except Exception as e:
    print(f"Error loading spaCy model: {e}")
    nlp_lemmatizer = None


def lemmatize_text(text):
    if nlp_lemmatizer is None:
         return text
    doc = nlp_lemmatizer(text)
    return " ".join([token.lemma_ for token in doc if not token.is_punct and not token.is_space])


travel_style_model = None
if os.path.exists(STYLE_MODEL_PATH):
    try:
        print(f"Loading travel style classification model from {STYLE_MODEL_PATH}...")
        travel_style_model = joblib.load(STYLE_MODEL_PATH)
        print("Travel style classification model loaded successfully.")
    except Exception as e:
        print(f"Error loading travel style model: {e}")
        print(f"Details: {e.__class__.__name__}: {e}")


interest_classifier_model = None
interest_label_binarizer = None
if os.path.exists(INTEREST_MODEL_PATH) and os.path.exists(INTEREST_BINARIZER_PATH):
    try:
        print(f"Loading interest classification model from {INTEREST_MODEL_PATH}...")
        interest_classifier_model = joblib.load(INTEREST_MODEL_PATH)
        print(f"Loading interest label binarizer from {INTEREST_BINARIZER_PATH}...")
        interest_label_binarizer = joblib.load(INTEREST_BINARIZER_PATH)
        print("Interest models loaded successfully.")
    except Exception as e:
        print(f"Error loading interest models: {e}")
        print(f"Details: {e.__class__.__name__}: {e}")
else:
     print(f"Interest models not found. Interests will be determined by keywords.")


INTEREST_KEYWORDS_FALLBACK = {
    "музей": ["музей", "галерея", "выставка", "экспозиция"],
    "парк": ["парк", "сквер", "сад", "аллея"],
    "еда": ["кафе", "ресторан", "кухня", "гастрономия", "бар"],
    "история": ["история", "исторический", "кремль", "древний", "памятник"],
    "активность": ["активный", "движение", "игра", "событие"],
    "шопинг": ["магазин", "шопинг", "рынок", "сувениры", "торговый центр"],
    "ночная жизнь": ["клуб", "ночь", "вечер", "дискотека", "паб"],
    "искусство": ["искусство", "художественный"],
    "архитектура": ["архитектура", "здание", "сооружение", "дворец", "улица", "собор", "церковь", "замок"],
    "природа": ["природа", "лес", "озеро", "река", "на воздухе", "за городом", "ландшафт"],
    "животные": ["животные", "зоопарк", "сафари", "фауна", "птицы"],
    "религия": ["религия", "церковь", "храм", "мечеть", "монастырь", "святыня"],
    "фотография": ["фото", "снимки", "фотографировать", "фотосессия"],
    "пляж": ["пляж", "море", "побережье", "загорать"],
    "релакс": ["релакс", "спа", "отдых", "расслабиться", "умиротворение"],
    "спорт": ["спорт", "стадион", "фитнес", "соревнования"],
    "музыка": ["музыка", "концерт", "фестиваль", "опера", "театр"],
    "культура": ["культура", "театр", "искусствоведческий", "традиции", "национальный"],
    "винный туризм": ["вино", "винодельня", "виноградник", "винный тур"],
    "дегустации": ["дегустация", "пробовать", "вино", "еда", "напитки"],
    "походы": ["поход", "трекинг", "маршрут", "тропа", "пешком"],
}

TRAVEL_STYLE_KEYWORDS_FALLBACK = {
     "бюджетный": ["недорогой", "бюджетный", "эконом", "дешево", "доступный"],
     "комфортный": ["комфортный", "удобный", "стандарт", "комфорт"],
     "люкс": ["роскошный", "люкс", "дорогой", "премиум", "элитный"],
     "активный": ["активный", "энергичный", "много ходить", "движение"],
     "спокойный": ["спокойный", "отдых", "релакс", "умиротворение"],
     "культурный": ["культурный", "музей", "театр", "галерея", "искусство", "выставка"],
     "гастрономический": ["гастрономия", "еда", "кухня", "ресторан", "кафе", "бар", "блюда"],
     "приключенческий": ["приключение", "экстрим", "новый опыт", "неизведанное", "авантюра"],
     "семейный отдых": ["семья", "дети", "семейный"],
     "одиночное путешествие": ["один", "одиночку", "самостоятельно"],
     "эко-туризм": ["эко", "природа", "заповедник"],
     "фототур": ["фото", "снимки", "фототур"],
     "Романтическое путешествие": ["романтический", "влюбленные", "свидание", "медовый месяц"],
     "Релаксационный": ["релакс", "спа", "отдых", "расслабиться"],
     "Историко-архитектурный": ["исторический", "архитектура", "древний", "замок", "собор"],
     "Экстремальный туризм": ["экстрим", "адреналин", "прыжок", "рафтинг", "полет"],
     "Пляжный отдых": ["пляж", "море", "солнце"],
     "Горный туризм": ["горы", "восхождение", "поход", "трекинг"],
     "Тур по фестивалям": ["фестиваль", "концерт", "событие", "праздник"],
     "Медицинский туризм": ["лечение", "медицинский", "клиника", "санаторий"],
     "Сельский туризм": ["сельский", "деревня", "ферма", "агротуризм"],
     "Сафари": ["сафари", "животные", "Африка"],
     "Исследовательский туризм": ["исследование", "экспедиция", "наука"],
}


def extract_travel_info(text: str) -> Dict[str, Any]:
    dates: Optional[Union[str, Tuple[date, date], timedelta]] = None
    budget: Optional[float] = None
    destinations: set[str] = set()
    raw_entities: List[Tuple[str, str]] = []

    processed_text = text.lower()
    if nlp_lemmatizer is not None:
         try:
              doc_lemmatizer = nlp_lemmatizer(text)
              processed_text = " ".join([token.lemma_ for token in doc_lemmatizer if not token.is_punct and not token.is_space])
         except Exception as e:
              print(f"Error during lemmatization: {e}")
              processed_text = text.lower()


    if nlp is not None:
        try:
            doc_nlp = nlp(text)
            raw_entities = [(ent.text, ent.label_) for ent in doc_nlp.ents]

            for ent in doc_nlp.ents:
                if ent.label_ == "DATE" or ent.label_ == "DURATION":
                    dates = ent.text

                elif ent.label_ == "MONEY":
                     try:
                         budget_text = ent.text.replace(",", ".").replace(" ", "").lower()
                         budget_text = budget_text.replace("рублей", "").replace("руб", "").replace("$", "").replace("€", "")
                         numbers = re.findall(r'\d+\.?\d*', budget_text)
                         if numbers:
                             budget = float(numbers[0])
                     except ValueError:
                         pass

                elif ent.label_ == "LOC" or ent.label_ == "GPE":
                     destinations.add(ent.text)

            if dates is None:
                 duration_match = re.search(r'на (\d+)\s*(день|дня|дней|неделю|недели|недель|месяц|месяца|месяцев)', processed_text)
                 if duration_match:
                     number = int(duration_match.group(1))
                     unit = duration_match.group(2)
                     dates = f"{number} {unit}"

            if budget is None:
                budget_match = re.search(r'(бюджет|до|около|стоимость)\s*(\d+)', processed_text)
                if budget_match:
                     try:
                         budget = float(budget_match.group(2))
                     except ValueError:
                         pass


        except Exception as e:
            print(f"Error during main nlp processing: {e}")
            raw_entities = []
            destinations = set()
            dates = None
            budget = None


    travel_style: Optional[str] = None
    if travel_style_model:
        try:
            processed_text_for_model = processed_text
            predicted_style = travel_style_model.predict([processed_text_for_model])[0]
            travel_style = predicted_style
        except Exception as e:
            print(f"Error predicting style with model: {e}")

    if travel_style is None:
         for style, keywords in TRAVEL_STYLE_KEYWORDS_FALLBACK.items():
             for keyword in keywords:
                 if keyword in processed_text:
                      travel_style = style
                      break
             if travel_style:
                 break

    interests_list: List[str] = []
    if interest_classifier_model and interest_label_binarizer:
        try:
            processed_text_for_model = processed_text
            
            scores = None

            if hasattr(interest_classifier_model, 'predict_proba'):
                 scores = interest_classifier_model.predict_proba([processed_text_for_model])
            elif hasattr(interest_classifier_model, 'decision_function'):
                 scores = interest_classifier_model.decision_function([processed_text_for_model])
                 pass
            else:
                 binary_predictions = interest_classifier_model.predict([processed_text_for_model])
                 predicted_interests_model = interest_label_binarizer.inverse_transform(binary_predictions)
                 if predicted_interests_model:
                      interests_list = list(predicted_interests_model[0])
                 scores = None


            if scores is not None:
                 predicted_labels_indices = [
                     i for i, score in enumerate(scores[0])
                     if score >= INTEREST_PREDICTION_THRESHOLD
                 ]
                 interests_list = [interest_label_binarizer.classes_[i] for i in predicted_labels_indices]


        except Exception as e:
            print(f"Error predicting interests with model or threshold: {e}")
            interests_list = []

    if not interests_list:
        interests_set_fallback = set()
        for interest_category, keywords in INTEREST_KEYWORDS_FALLBACK.items():
             for keyword in keywords:
                 if keyword in processed_text:
                     interests_set_fallback.add(interest_category)

        interests_list = list(interests_set_fallback)


    return {
        "interests": interests_list,
        "travel_style": travel_style,
        "destination": list(destinations),
        "raw_entities": raw_entities
    }