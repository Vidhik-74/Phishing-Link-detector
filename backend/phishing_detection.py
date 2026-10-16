from urllib.parse import urlparse
import re

shortener_d = {"bit.ly", "tinyurl.com", "t.co", "cutt.ly", "short.io", "rebrand.ly",
               "is.gd", "shorte.st", "ow.ly", "buff.ly", "lnkd.in", "amzn.to",
               "goo.gl", "fb.me", "tiny.cc"}

sus_keywords = ["login", "log-in", "signin", "sign-in", "signon", "authenticate",
                "authentication", "account", "verify", "verification", "validate",
                "validation", "confirm", "confirmation", "activate", "activation",
                "bank", "password", "passwd", "passcode", "credentials", "credential",
                "username", "userid", "billing", "payment"]


def extract_features(url: str) -> dict:
    parsed = urlparse(url)
    hostname = parsed.hostname or ""

    features = {}
    features["sus_keyword_hits"] = [word for word in sus_keywords if word in url.lower()]
    features["length"] = len(url)
    features["is_ip"] = bool(re.match(r"^\d{1,3}(\.\d{1,3}){3}$", hostname))
    features["uses_https"] = parsed.scheme == "https"
    features["has_at_symbol"] = "@" in url
    features["num_hyphens"] = hostname.count("-")
    features["is_shortener"] = hostname in shortener_d
    features["num_subdomains"] = max(0, len(hostname.split(".")) - 2)
    return features


def score_url(features: dict) -> tuple[int, list[dict]]:
    score = 0
    reasons = []

    if features["length"] > 100:
        score += 5
        reasons.append({"text": "Too long", "severity": "warn"})
    if features["is_ip"]:
        score += 20
        reasons.append({"text": "Used IP in place of domain name", "severity": "warn"})
    if features["num_hyphens"] > 3:
        score += 10
        reasons.append({"text": "Too many hyphens", "severity": "warn"})
    if not features["uses_https"]:
        score += 15
        reasons.append({"text": "Not using https", "severity": "warn"})
    if features["has_at_symbol"]:
        score += 15
        reasons.append({"text": "Has @ symbol", "severity": "warn"})

    hits = features["sus_keyword_hits"]
    if hits:
        score += min(15 + 10 * (len(hits) - 1), 40)
        reasons.append({
            "text": f"Has suspicious keywords: {', '.join(hits)}",
            "severity": "warn"
        })

    if features["is_shortener"]:
        score += 10
        reasons.append({"text": "Domain shortener is used", "severity": "warn"})
    if features["num_subdomains"] >= 3:
        score += 10
        reasons.append({"text": "Too many subdomains", "severity": "warn"})

    return score, reasons


def classify(score: int) -> str:
    if score <= 14:
        return "low"
    elif score <= 39:
        return "medium"
    else:
        return "high"


def analyze_url(url: str) -> dict:
    features = extract_features(url)
    score, reasons = score_url(features)
    risk_level = classify(score)
    return {
        "url": url,
        "domain": urlparse(url).hostname,
        "riskLevel": risk_level,
        "status": "safe" if risk_level == "low" else "risk",
        "reasons": reasons,
    }