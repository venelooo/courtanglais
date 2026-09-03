export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: 'Clé API manquante. Ajoute ANTHROPIC_API_KEY dans les variables d\'environnement Vercel.' });
  }

  const { day = 1, streak = 0, recentTitles = '', weakPoints = '' } = req.body || {};

  const system = `Tu es le meilleur professeur d'anglais du monde, spécialisé dans l'enseignement à des adultes francophones totalement débutants qui ont peur de l'anglais et perdent confiance facilement.
Ton élève: entrepreneur français, débutant absolu, objectif de parler anglais correctement en 4 mois via des leçons quotidiennes très courtes.
Règles absolues:
- Explique TOUT en français, avec des mots très simples, comme si tu parlais à quelqu'un qui n'a jamais appris l'anglais (niveau CP).
- Une seule notion nouvelle par jour, jamais plus. Pas de jargon grammatical compliqué.
- Ton chaleureux, patient, jamais condescendant. Toujours rassurant sur le fait qu'il progresse.
- Toujours donner exactement 3 mots de vocabulaire, une phrase d'exemple simple, et UN seul petit exercice avec une réponse attendue courte et sans ambiguïté.
- L'exercice doit être faisable en moins d'une minute (traduire un mot, compléter un trou, choisir entre deux mots).
Réponds UNIQUEMENT avec un objet JSON valide, rien avant, rien après, format exact:
{
  "title": "titre très court de la leçon en français",
  "mini_lesson": "explication simple en français, 3-5 phrases maximum",
  "vocab": [{"en":"...", "fr":"...", "phonetic":"..."}, {"en":"...", "fr":"...", "phonetic":"..."}, {"en":"...", "fr":"...", "phonetic":"..."}],
  "example_sentence": "phrase simple en anglais",
  "example_sentence_fr": "traduction en français",
  "exercise_question": "consigne de l'exercice en français",
  "expected_answer": "réponse attendue, en minuscules, sans ponctuation",
  "hint": "indice en français si l'élève bloque",
  "encouragement": "une phrase d'encouragement courte et sincère en français, spécifique à sa progression"
}`;

  const userMsg = `C'est le jour ${day} de son apprentissage. Streak actuel: ${streak} jours.
Leçons récentes déjà vues: ${recentTitles || 'aucune leçon précédente (tout premier jour)'}.
Points faibles repérés: ${weakPoints || 'aucun point faible identifié pour l\'instant'}.
Génère la leçon du jour ${day}, en progression logique et douce par rapport aux leçons précédentes (ne répète pas exactement le même vocabulaire).`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1200,
        system,
        messages: [{ role: 'user', content: userMsg }]
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ error: data });
    }

    const text = (data.content || [])
      .filter(b => b.type === 'text')
      .map(b => b.text)
      .join('\n');
    const clean = text.replace(/```json|```/g, '').trim();
    const lesson = JSON.parse(clean);

    return res.status(200).json(lesson);
  } catch (e) {
    return res.status(500).json({ error: String(e) });
  }
}
