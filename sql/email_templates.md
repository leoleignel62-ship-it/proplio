# Templates email Supabase (configuration manuelle)

Configurer ces templates dans **Supabase Dashboard > Authentication > Email Templates**.

## 1) Confirm signup (vérification email)

**Subject**  
Confirmez votre inscription sur Proplio

**Body HTML**
```html
<h2>Bienvenue sur Proplio !</h2>
<p>Merci de vous être inscrit sur Proplio, votre plateforme de gestion locative.</p>
<p>Cliquez sur le bouton ci-dessous pour confirmer votre adresse email :</p>
<a href="{{ .ConfirmationURL }}" style="background-color: #7C3AED; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block;">Confirmer mon email</a>
<p>Si vous n'avez pas créé de compte, ignorez cet email.</p>
```

## 2) Reset password

**Subject**  
Réinitialisez votre mot de passe Proplio

**Body HTML**
```html
<h2>Réinitialisation de mot de passe</h2>
<p>Vous avez demandé à réinitialiser votre mot de passe Proplio.</p>
<a href="{{ .ConfirmationURL }}" style="background-color: #7C3AED; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block;">Réinitialiser mon mot de passe</a>
<p>Si vous n'avez pas fait cette demande, ignorez cet email.</p>
```
