export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: 'Clé API manquante.' });
  }

  const { level = 'faux-debutant', levelLabel = '', recentVocab = '' } = req.body || {};

  const system = `Tu es un professeur d'anglais qui prépare des exercices de pratique libre pour un adulte francophone entrepreneur.
Niveau réel: ${level} (${levelLabel}).
Vocabulaire récemment vu à réutiliser si possible: ${recentVocab || 'aucun, utilise du vocabulaire courant adapté au niveau'}.
Génère 3 exercices courts et variés (traduire une phrase courte, compléter un trou, corriger une erreur) qui renforcent ce qui a été vu récemment. Chaque exercice doit être faisable en moins d'une minute, réponse courte et sans ambiguïté.
Réponds UNIQUEMENT avec un objet JSON valide, rien avant, rien après, format exact:
{
  "items": [
    {"prompt": "consigne en français", "expected_answer": "réponse attendue, minuscules, sans ponctuation", "hint": "indice en français"},
    ... (3 exercices au total)
  ]
}`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-5',
        max_tokens: 900,
        system,
        messages: [{ role: 'user', content: 'Génère 3 exercices de pratique libre.' }]
      })
    });
    const data = await response.json();
    if (!response.ok) return res.status(response.status).json({ error: data });
    const text = (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('\n');
    const clean = text.replace(/```json|```/g, '').trim();
    return res.status(200).json(JSON.parse(clean));
  } catch (e) {
    return res.status(500).json({ error: String(e) });
  }
}
