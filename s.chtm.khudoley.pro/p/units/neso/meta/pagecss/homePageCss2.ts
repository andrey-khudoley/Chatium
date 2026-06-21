// @shared
export const homePageCss2 = `

.hero-description {
  font-size: 1rem;
  line-height: 1.6;
  color: var(--color-text-secondary);
  font-weight: 400;
  margin: 0;
  margin-bottom: 2rem;
  min-height: 1.6rem;
  max-width: 600px;
  letter-spacing: 0.05em;
  text-shadow: 0 0 6px rgba(160, 160, 160, 0.2);
}

@media (min-width: 1201px) {
  .content-wrapper {
    padding: 1rem 0;
  }
  .content-inner {
    gap: 1.5rem;
  }
  .hero-section {
    gap: 0.75rem;
    padding: 0.5rem 0;
  }
  .hero-description {
    margin-bottom: 0.25rem;
  }
}

@media (max-width: 768px) {
  .content-inner {
    padding: 0 1rem;
    gap: 3rem;
  }
  .content-wrapper {
    padding: 2rem 0;
  }
  .hero-section {
    gap: 1.25rem;
    padding: 1rem 0;
  }
  .hero-heading {
    font-size: 2rem;
  }
  .hero-description {
    font-size: 0.9375rem;
  }
}

@media (max-width: 480px) {
  .content-inner {
    padding: 0 0.75rem;
    gap: 2.5rem;
  }
  .content-wrapper {
    padding: 1.5rem 0;
  }
  .hero-section {
    gap: 1rem;
  }
  .hero-heading {
    font-size: 1.75rem;
    letter-spacing: 0.08em;
  }
  .hero-description {
    font-size: 0.875rem;
    line-height: 1.5;
  }
}
`
