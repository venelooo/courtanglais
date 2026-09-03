export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: 'Clé API manquante.' });
  }

  const {
    moduleTitle = '', moduleTheme = '', lessonInModule = 1, lessonsPerModule = 14,
    level = 'faux-debutant', levelLabel = '', recentTitles = ''
  } = req.body || {};

  const levelInstructions = {
    'debutant-fragile': "Niveau réel: bases fragiles. Reste progressif mais SANS être condescendant — pas de ton pour enfant, explique les mécanismes.",
    'faux-debutant': "Niveau réel: faux débutant, vocabulaire et restes scolaires mais mal structurés, surtout à l'oral. Ne recommence PAS par des bases ultra élémentaires. Concentre-toi sur structurer ce qu'il sait déjà.",
    'intermediaire': "Niveau réel: intermédiaire. Travaille précision grammaticale, fluidité, vocabulaire riche/professionnel. Pas de contenu débutant."
  };

  const system = `Tu es un professeur d'anglais professionnel et rigoureux pour un adulte francophone entrepreneur.
Tu enseignes dans le cadre d'un module structuré: "${moduleTitle}" — thème du module: ${moduleTheme}.
C'est la leçon ${lessonInModule} sur ${lessonsPerModule} de ce module: progresse logiquement à l'intérieur du thème (ne redonne pas exactement la même notion que les leçons précédentes du module).
${levelInstructions[level] || levelInstructions['faux-debutant']}
Contexte donné par l'élève sur son niveau: "${levelLabel}".
Leçons récentes déjà vues (à ne pas répéter à l'identique): ${recentTitles || 'aucune'}.
Règles absolues:
- Explique en français, clairement, avec les vrais termes grammaticaux quand pertinent (présent simple, passé, conditionnel, etc.), sans les éviter.
- Une notion précise par leçon, cohérente avec le thème du module et sa progression.
- Ton direct, professionnel, jamais infantilisant. Pas de "Hello" comme s'il découvrait l'anglais.
- Toujours donner exactement 3 éléments de vocabulaire/structures utiles, une phrase d'exemple naturelle, un exercice concret avec réponse attendue courte et sans ambiguïté.
Réponds UNIQUEMENT avec un objet JSON valide, rien avant, rien après, format exact:
{
  "title": "titre court de la leçon en français",
  "mini_lesson": "explication en français, 3-5 phrases",
  "vocab": [{"en":"...", "fr":"...", "phonetic":"..."}, {"en":"...", "fr":"...", "phonetic":"..."}, {"en":"...", "fr":"...", "phonetic":"..."}],
  "example_sentence": "phrase naturelle en anglais",
  "example_sentence_fr": "traduction",
  "exercise_question": "consigne en français",
  "expected_answer": "réponse attendue, minuscules, sans ponctuation",
  "hint": "indice en français",
  "encouragement": "phrase courte et sincère, spécifique à sa progression"
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
        max_tokens: 1200,
        system,
        messages: [{ role: 'user', content: `Génère la leçon ${lessonInModule}/${lessonsPerModule} du module "${moduleTitle}".` }]
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
