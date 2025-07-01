from typing import Dict, Optional

EXCHANGE_RATES: Dict[str, Dict[str, float]] = {
    "RUB": {
        "RUB": 1.0,
        "USD": 1/90.0, 
        "EUR": 1/100.0,
        "GBP": 1/115.0,
    },
    "USD": {
        "RUB": 90.0,
        "USD": 1.0,
        "EUR": 0.90, 
        "GBP": 0.78,
    },
    "EUR": {
        "RUB": 100.0,
        "USD": 1.11,
        "EUR": 1.0,
        "GBP": 0.87,
    },
}

def convert_currency(amount: float, from_currency: str, to_currency: str) -> Optional[float]:
    """
    Converts an amount from one currency to another using fixed exchange rates.

    Args:
        amount: The amount to convert.
        from_currency: The currency code to convert from (e.g., "RUB", "USD").
        to_currency: The currency code to convert to.

    Returns:
        The converted amount, or None if currency is not supported or exchange rate is missing.
    """
    if from_currency == to_currency:
        return amount

    from_currency = from_currency.upper()
    to_currency = to_currency.upper()

    if from_currency not in EXCHANGE_RATES or to_currency not in EXCHANGE_RATES[from_currency]:
        print(f"Warning: Exchange rate from {from_currency} to {to_currency} not found.")
        return None

    exchange_rate = EXCHANGE_RATES[from_currency][to_currency]
    return amount * exchange_rate
