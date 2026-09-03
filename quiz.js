export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: 'Clé API manquante.' });
  }

  const { moduleTitle = '', moduleTheme = '', vocabSeen = '', level = 'faux-debutant' } = req.body || {};

  const system = `Tu es un professeur d'anglais qui prépare un contrôle de fin de module pour un adulte francophone entrepreneur, niveau: ${level}.
Module testé: "${moduleTitle}" — thème: ${moduleTheme}.
Vocabulaire et notions vues pendant ce module: ${vocabSeen || 'non spécifié, base-toi sur le thème du module'}.
Génère 5 questions à choix multiples (4 options chacune) qui testent vraiment la compréhension du thème du module, pas juste du vocabulaire au hasard. Questions en anglais ou testant une structure grammaticale du module. Difficulté raisonnable, une seule bonne réponse par question, sans ambiguïté.
Réponds UNIQUEMENT avec un objet JSON valide, rien avant, rien après, format exact:
{
  "questions": [
    {"question": "...", "options": ["...", "...", "...", "..."], "correct_index": 0, "explanation": "courte explication en français"},
    ... (5 questions au total)
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
        max_tokens: 1500,
        system,
        messages: [{ role: 'user', content: `Génère le contrôle du module "${moduleTitle}".` }]
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
