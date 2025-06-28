import argparse
import os
import pandas as pd
import numpy as np
import joblib
import warnings
from sklearn.model_selection import train_test_split, GridSearchCV
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.multiclass import OneVsRestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import MultiLabelBinarizer
from sklearn.metrics import classification_report
from sklearn.exceptions import ConvergenceWarning

# Ваши функции лемматизации
from app.nlp.processor import lemmatize_text, nlp_lemmatizer

# Попытка импортировать MultilabelStratifiedShuffleSplit для стратифицированного разбиения
try:
    from iterstrat.ml_stratifiers import MultilabelStratifiedShuffleSplit
    HAS_ML_STRAT = True
except ImportError:
    HAS_ML_STRAT = False
    print("Warning: iterstrat.ml_stratifiers.MultilabelStratifiedShuffleSplit не установлен. Будет использоваться простое train_test_split.")

warnings.filterwarnings("ignore", category=ConvergenceWarning)


def main():
    parser = argparse.ArgumentParser(description="Обучение мульти-лейбл классификатора интересов")
    parser.add_argument("--data-file", default="app/data/interest_training_data.csv", help="Путь к CSV с данными (две колонки: text, interests)")
    parser.add_argument("--model-dir", default="app/nlp", help="Папка для сохранения модели и бинаризатора меток")
    parser.add_argument("--report-file", default="interest_classification_report.txt", help="Название файла для сохранения отчета с метриками")
    parser.add_argument("--grid-search", action="store_true", help="Включить подбор гиперпараметров через GridSearchCV")
    args = parser.parse_args()

    # Проверка лемматизатора
    if nlp_lemmatizer is None:
        print("Ошибка: лемматизатор не загружен. Проверьте установку вашего NLP-процессора.")
        return

    # Создание папки для модели
    os.makedirs(args.model_dir, exist_ok=True)

    # Загрузка данных
    df = pd.read_csv(args.data_file, header=None, names=["text", "interests"] )
    df['text'] = df['text'].astype(str)
    df['interests'] = df['interests'].fillna("").apply(lambda x: x.split(';') if x else [])

    # Бинаризация меток
    mlb = MultiLabelBinarizer()
    y = mlb.fit_transform(df['interests'])
    labels = mlb.classes_

    # Разбиение на train/test
    if len(df) > 50 and len(labels) > 1:
        if HAS_ML_STRAT:
            msss = MultilabelStratifiedShuffleSplit(n_splits=1, test_size=0.2, random_state=42)
            train_idx, test_idx = next(msss.split(df['text'], y))
            X_train = df['text'].iloc[train_idx]
            X_test = df['text'].iloc[test_idx]
            y_train = y[train_idx]
            y_test = y[test_idx]
        else:
            X_train, X_test, y_train, y_test = train_test_split(
                df['text'], y, test_size=0.2, random_state=42
            )
    else:
        X_train = df['text']
        y_train = y
        X_test = None
        y_test = None

    # Построение пайплайна
    vectorizer = TfidfVectorizer(
        preprocessor=lemmatize_text,
        ngram_range=(1, 2),
        max_df=0.95,
        min_df=2
    )
    classifier = OneVsRestClassifier(
        LogisticRegression(class_weight='balanced', max_iter=2000)
    )

    if args.grid_search:
        # Параметры для поиска
        param_grid = {
            'vectorizer__min_df': [1, 2, 5],
            'vectorizer__max_df': [0.80, 0.90, 0.95],
            'vectorizer__ngram_range': [(1, 1), (1, 2)],
            'classifier__estimator__C': [0.1, 1.0, 10.0]
        }
        from sklearn.pipeline import Pipeline
        pipeline = Pipeline([
            ('vectorizer', vectorizer),
            ('classifier', classifier)
        ])
        grid = GridSearchCV(
            pipeline,
            param_grid=param_grid,
            cv=5,
            scoring='f1_macro',
            n_jobs=-1
        )
        print("Запуск GridSearchCV для поиска оптимальных гиперпараметров...")
        grid.fit(X_train, y_train)
        best_model = grid.best_estimator_
        print(f"Лучшие параметры: {grid.best_params_}")
    else:
        from sklearn.pipeline import Pipeline
        best_model = Pipeline([
            ('vectorizer', vectorizer),
            ('classifier', classifier)
        ])
        best_model.fit(X_train, y_train)

    # Оценка на тестовой выборке
    if X_test is not None and y_test is not None:
        y_pred = best_model.predict(X_test)
        report = classification_report(y_test, y_pred, target_names=labels, zero_division=0)
        print("Classification Report (Test Set):\n", report)
        # Сохранение отчета
        report_path = os.path.join(args.model_dir, args.report_file)
        with open(report_path, 'w', encoding='utf-8') as f:
            f.write(report)
        print(f"Отчет сохранён в: {report_path}")
    else:
        print("Тестовая выборка не создана (недостаточно данных). Оценка на тесте не проводилась.")

    # Сохранение модели и бинаризатора
    model_path = os.path.join(args.model_dir, 'interest_classifier_model.pkl')
    binarizer_path = os.path.join(args.model_dir, 'interest_label_binarizer.pkl')
    joblib.dump(best_model, model_path)
    joblib.dump(mlb, binarizer_path)
    print(f"Модель сохранена в: {model_path}")
    print(f"Бинаризатор меток сохранён в: {binarizer_path}")
    train_set = set(X_train.tolist())
    test_set = set(X_test.tolist())
    print("Совпадающих элементов:", len(train_set & test_set))



if __name__ == "__main__":
    main()