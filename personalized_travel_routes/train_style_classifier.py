import argparse
import os
import pandas as pd
import numpy as np
import joblib
import warnings
from sklearn.model_selection import train_test_split, GridSearchCV, StratifiedKFold, cross_val_score
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import classification_report
from sklearn.pipeline import Pipeline
from sklearn.exceptions import ConvergenceWarning

# Ваши функции лемматизации
from app.nlp.processor import lemmatize_text, nlp_lemmatizer

warnings.filterwarnings("ignore", category=ConvergenceWarning)


def main():
    parser = argparse.ArgumentParser(description="Обучение мультиклассового классификатора стилей путешествий")
    parser.add_argument("--data-file", default="app/data/travel_style_training_data.csv", help="Путь к CSV с данными (две колонки: text, style)")
    parser.add_argument("--model-dir", default="app/nlp", help="Папка для сохранения модели")
    parser.add_argument("--report-file", default="style_classification_report.txt", help="Название файла для сохранения отчета с метриками")
    parser.add_argument("--cross-validate", action="store_true", help="Выполнить K-Fold кросс-валидацию перед обучением")
    parser.add_argument("--grid-search", action="store_true", help="Включить подбор гиперпараметров через GridSearchCV")
    args = parser.parse_args()

    # Проверка лемматизатора
    if nlp_lemmatizer is None:
        print("Ошибка: лемматизатор не загружен. Проверьте установку вашего NLP-процессора.")
        return

    # Создание папки для модели
    os.makedirs(args.model_dir, exist_ok=True)

    # Загрузка данных
    df = pd.read_csv(args.data_file, header=None, names=["text", "style"] )
    df['text'] = df['text'].astype(str)

    # Просмотр распределения меток
    print("Распределение стилей:")
    print(df['style'].value_counts())

    # Разбиение на train/test
    if len(df) > 30 and df['style'].nunique() > 1:
        X_train, X_test, y_train, y_test = train_test_split(
            df['text'], df['style'], test_size=0.2, random_state=42, stratify=df['style']
        )
    else:
        X_train = df['text']
        y_train = df['style']
        X_test = None
        y_test = None

    # Построение пайплайна
    vectorizer = TfidfVectorizer(
        preprocessor=lemmatize_text,
        ngram_range=(1, 2),
        max_df=0.95,
        min_df=2
    )
    classifier = LogisticRegression(class_weight='balanced', max_iter=2000)
    pipeline = Pipeline([
        ('vectorizer', vectorizer),
        ('classifier', classifier)
    ])

    # Кросс-валидация, если указано
    if args.cross_validate:
        skf = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
        scores = cross_val_score(pipeline, df['text'], df['style'], cv=skf, scoring='f1_macro', n_jobs=-1)
        print(f"F1-macro по 5 фолдам: {scores}, среднее = {scores.mean():.3f}")

    # Подбор гиперпараметров
    if args.grid_search:
        param_grid = {
            'vectorizer__min_df': [1, 2, 5],
            'vectorizer__max_df': [0.80, 0.90, 0.95],
            'vectorizer__ngram_range': [(1, 1), (1, 2)],
            'classifier__C': [0.1, 1.0, 10.0]
        }
        grid = GridSearchCV(pipeline, param_grid=param_grid, cv=5, scoring='f1_macro', n_jobs=-1)
        print("Запуск GridSearchCV для поиска оптимальных гиперпараметров...")
        grid.fit(X_train, y_train)
        best_model = grid.best_estimator_
        print(f"Лучшие параметры: {grid.best_params_}")
    else:
        best_model = pipeline
        best_model.fit(X_train, y_train)

    # Оценка на тестовой выборке
    if X_test is not None and y_test is not None:
        y_pred = best_model.predict(X_test)
        report = classification_report(y_test, y_pred, zero_division=0)
        print("Classification Report (Test Set):\n", report)
        # Сохранение отчета
        report_path = os.path.join(args.model_dir, args.report_file)
        with open(report_path, 'w', encoding='utf-8') as f:
            f.write(report)
        print(f"Отчет сохранён в: {report_path}")
    else:
        print("Тестовая выборка не создана (недостаточно данных). Оценка на тесте не проводилась.")

    # Сохранение модели
    model_path = os.path.join(args.model_dir, 'travel_style_model.pkl')
    joblib.dump(best_model, model_path)
    print(f"Модель сохранена в: {model_path}")
    train_set = set(X_train.tolist())
    test_set = set(X_test.tolist())
    print("Совпадающих элементов:", len(train_set & test_set))



if __name__ == "__main__":
    main()
