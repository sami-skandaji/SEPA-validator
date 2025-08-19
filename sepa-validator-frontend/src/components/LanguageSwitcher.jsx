// src/components/LanguageSwitcher.jsx
import React from "react";
import { useTranslation } from "react-i18next";

const LanguageSwitcher = () => {
  const { i18n, t } = useTranslation();

  const changeLanguage = (e) => {
    const selectedLang = e.target.value;
    i18n.changeLanguage(selectedLang);
    localStorage.setItem("lang", selectedLang); // Persister la langue
  };

  return (
    <div className="ml-2">
      <label htmlFor="lang-select" className="mr-1">
        {t("languageSwitcher.label")}:
      </label>
      <select
        id="lang-select"
        onChange={changeLanguage}
        value={i18n.language}
        className="form-control d-inline-block"
        style={{ width: "auto", display: "inline-block" }}
      >
        <option value="fr">FR</option>
        <option value="en">EN</option>
      </select>
    </div>
  );
};

export default LanguageSwitcher;
