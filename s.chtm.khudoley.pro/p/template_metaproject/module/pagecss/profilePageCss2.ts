// @shared
export const profilePageCss2 = `

.profile-field:hover {
  border-color: var(--color-accent);
  box-shadow: 0 0 20px rgba(211, 35, 75, 0.1);
}

.profile-field-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.5rem;
}

.profile-field-icon {
  width: 32px;
  height: 32px;
  border-radius: 6px;
  background: var(--color-accent-light);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-accent);
}

.profile-field-label {
  color: var(--color-text-secondary);
  font-size: 0.9rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  font-weight: 500;
}

.profile-field-value {
  color: var(--color-text);
  font-size: 1.1rem;
  font-weight: 600;
  padding-left: 2.75rem;
}

@media (max-width: 768px) {
  .profile-heading {
    font-size: 2rem;
  }

  .profile-card {
    padding: 1.5rem;
  }

  .profile-field-value {
    padding-left: 0;
  }
}
`
