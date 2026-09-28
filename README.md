# MindEdit

Un plugin Obsidian qui affiche et édite une note Markdown sous forme de mindmap,
avec certains raccourcis usuels de clavier de FreePlane.

La note reste un fichier `.md` ordinaire, lisible et modifiable normalement. La
mindmap n'est qu'une **autre façon de la regarder** — jamais un second format,
jamais une seconde note.

---

## Installation

1. Télécharger les trois fichiers de ce dossier :
   - `manifest.json`
   - `main.js`
   - `styles.css`

2. Dans votre coffre Obsidian, créer le dossier :
   ```
   .obsidian/plugins/mindedit/
   ```

3. Y placer les trois fichiers.

4. Redémarrer Obsidian, ou aller dans Paramètres → Modules complémentaires →
   *Recharger*, puis activer **MindEdit**.

---

## Utilisation

### Basculer entre Markdown et mindmap

L'icône réseau dans le ruban de gauche, ou la palette de commandes →
« Basculer entre Markdown et mindmap ».

Le basculement écrit `mindmap: true` dans le **frontmatter** de la note — le bloc
de métadonnées entre deux lignes `---` en tête de fichier. C'est la seule chose
qu'il touche : le corps du texte n'est jamais modifié par le basculement. Une
note portant ce drapeau se rouvrira directement en mindmap.

### Clavier

La carte doit avoir le focus : **clique une fois dedans**.

| Touche | Effet |
|---|---|
| `↓` `↑` | nœud suivant / précédent **au même niveau**, en traversant les branches |
| `←` | remonte au parent |
| `→` | déplie si replié ; sinon descend au premier enfant |
| `Espace` | plie ou déplie le nœud actif |
| `Alt+Début` | referme toute la profondeur ; le nœud actif reste ouvert |
| `Alt+Fin` | déplie tout depuis le nœud actif |
| `Fin` | édite le texte, curseur à la fin |
| `Début` | édite le texte, curseur au début |
| `Entrée` | nouveau frère **en dessous** |
| `Shift+Entrée` | nouveau frère **au-dessus** |
| `Tab` | nouveau **dernier** enfant |
| `Shift+Tab` | intercale un parent entre le nœud et son parent actuel |
| `Suppr` | supprime le nœud **et toute sa descendance** |
| `Ctrl+←` | sort d'un niveau : le nœud devient le **dernier frère de son parent** |
| `Ctrl+→` | rentre d'un niveau : le nœud devient le **dernier enfant de son frère précédent** |
| `Ctrl+↑` `Ctrl+↓` | déplace le nœud dans sa fratrie |
| `Ctrl+1` … `Ctrl+6` | donne au nœud ce niveau de titre |
| `Ctrl+Z` / `Ctrl+Y` | annule / refait |

Les quatre `Ctrl+flèche` emportent **toute la descendance** du nœud. Les frères
qui le suivaient, eux, ne bougent pas : il part seul avec sa branche.

> **Une seule règle gouverne tous les déplacements : un nœud garde sa nature.**
> Une puce reste une puce, un titre reste un titre. Tout ce qui exigerait une
> conversion — sortir une puce de sous un titre en ferait un titre — est refusé,
> en silence. Changer la nature d'un nœud reste un geste délibéré, celui de
> `Ctrl+1`…`Ctrl+6`.

`Ctrl+↑` et `Ctrl+↓` valent donc aussi pour les titres : réordonner deux
chapitres ne convertit rien.

Pendant l'édition d'un texte : `Entrée` valide, `Échap` annule, cliquer ailleurs
valide.

| Pendant l'édition, avec du texte sélectionné | Effet |
|---|---|
| `Ctrl+B` | entoure la sélection de `**`, ou les retire s'ils y sont ou l'encadrent |
| `Ctrl+I` | entoure la sélection de `*`, ou l'enlève s'il y est ou l'encadre |

- Les **espaces au bord** de la sélection restent hors des marqueurs :
  `**gras **` ne s'afficherait pas en gras.
- La série d'étoiles se lit **comme au rendu** : une pour l'italique, deux pour
  le gras, trois pour les deux. Chaque touche ne bascule que sa part — `Ctrl+I`
  sur `**gras**` donne `***gras***`, sans perdre le gras.
- Le résultat **reste sélectionné, marqueurs compris** : refaire la même touche
  défait aussitôt, et `Ctrl+B` puis `Ctrl+I` donne du gras italique.
- Les étoiles sont cherchées **dans la sélection et juste autour** : un
  double-clic sur un mot en gras ne sélectionne que le mot, sans ses `**`, et
  `Ctrl+B` les retire quand même. Le retrait marche donc encore le lendemain,
  quand plus rien n'est annulable.
- On ne tient compte que des étoiles présentes **des deux côtés** : une étoile
  collée d'un seul côté n'encadre rien.
- `Ctrl+Z` annule l'ajout dans le texte, comme une frappe.
- Sans sélection, rien ne se passe.

Un nœud qu'on vient de créer s'ouvre aussitôt en saisie. Si on l'abandonne par
`Échap` ou en le laissant vide, **sa création est annulée** — pas de puce vide
oubliée dans le fichier.

### Souris et tactile

| Geste | Effet |
|---|---|
| clic ou appui sur un nœud replié | le sélectionne **et** le déplie |
| clic ou appui sur un nœud déplié non sélectionné | le sélectionne seulement |
| clic ou appui sur le nœud déjà sélectionné | le replie |
| clic ou appui sur la pastille | plie ou déplie, toujours |
| clic ou appui sur une case à cocher | la coche ou la décoche |
| double-clic, double-appui | édite le texte |
| molette | zoom, centré sur le curseur |
| glisser, un doigt | déplace la carte |
| pincer, deux doigts | zoome, centré entre les doigts |

Souris, doigt et stylet passent par le **même** chemin de code : les Pointer
Events ne les distinguent pas. Un appui tolère quelques pixels de tremblement
avant de devenir un déplacement, sans quoi désigner un nœud au doigt ferait
frémir la carte.

> **La logique du clic n'est pas une bascule ordinaire, et c'est délibéré.**
> Déplier ne détruit rien ; replier détruit ta vue. Le geste non destructeur est
> donc immédiat, le destructeur exige que le nœud soit déjà sélectionné. C'est ce
> qui permet de sélectionner un parent sans le refermer au passage.

---

## Comment MindEdit lit ton Markdown

C'est le point à comprendre pour que la carte ait la forme voulue.

| Dans le fichier | Dans la carte |
|---|---|
| le **nom du fichier** | la racine, toujours — jamais un titre du corps |
| `# Titre` | un nœud **et** un niveau de profondeur : ce qui suit lui appartient |
| `- texte` / `* texte` | un nœud ; la puce ne s'affiche pas |
| indentation d'une puce | la profondeur dans l'arbre |
| `1. texte` | un nœud dont le numéro **reste visible** |
| `[x]` / `[ ]` en tête | une case à cocher, cliquable |
| ligne indentée sans puce | la suite du texte du nœud au-dessus |
| ligne sans puce ni titre | un nœud, sans plus |
| bloc de code ` ``` ` | **entièrement ignoré**, y compris les `#` qu'il contient |
| `**gras**` `*italique*` | mis en forme dans le nœud, marqueurs masqués |
| `` `code` `` `~~barré~~` `==surligné==` | de même |
| `[[liens]]` `#tags` | affichés **bruts**, avec leur syntaxe |

Le **niveau** de titre (`#`, `##`, `###`) fait donc deux choses à la fois : il
stylise, et il ouvre un cran de profondeur. Le donner reste ton geste, avec
`Ctrl+1`…`Ctrl+6`.

> **La mise en forme est affichée, jamais absorbée.** Un nœud montre `**gras**`
> en gras, mais dès que tu l'édites, le texte redevient le
> Markdown littéral. Sans ça, valider une retouche écrirait `gras` dans ton
> fichier et le balisage disparaîtrait sans un mot.

### Exemple

```markdown
# Contrat

* Cette mission a pour objectif de refondre le site vitrine…
* Indicateurs de réussite :
   * le tunnel de commande reste disponible pendant toute la bascule
   * les pages se chargent en moins d'une seconde sur mobile
```

```
Contrat.md  (racine = nom du fichier)
└── Contrat  [titre]
    ├── Cette mission a pour objectif de refondre le site vitrine…
    └── Indicateurs de réussite :
        ├── le tunnel de commande reste disponible pendant toute la bascule
        └── les pages se chargent en moins d'une seconde sur mobile
```

---

## Licence

**GPL-3.0-or-later**

Ce choix est délibéré : tout ce qui dérive de ce code doit rester libre.
