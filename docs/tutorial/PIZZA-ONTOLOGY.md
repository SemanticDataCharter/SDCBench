# pizza.owl, the ontology behind tutorial step 4

**File:** `docs/tutorial/pizza.owl` (163,301 bytes, SHA-256 `f1af596252f2e2a9f2df85bc64a9384dcf88a558084c25add5ffedca163ba45a`)
**Source:** https://protege.stanford.edu/ontologies/pizza/pizza.owl, fetched 2026-09-14
**Version:** 2.0 (`owl:versionInfo` 2.0, `owl:versionIRI` http://www.co-ode.org/ontologies/pizza/2.0.0)
**Ontology IRI / namespace:** `http://www.co-ode.org/ontologies/pizza/pizza.owl#`
**License:** Creative Commons Attribution 3.0 (CC BY 3.0), declared in the file as `dcterms:license`
**Contributors (from the file):** Nick Drummond, Alan Rector, Matthew Horridge, Chris Wroe, Robert Stevens; the University of Manchester Protégé OWL tutorial.

## Why this copy

The GitHub repository at github.com/owlcs/pizza-ontology carries version 1.5 (entity-encoded,
no license annotation, 1,930 class declarations including the tutorial's worked examples).
The Stanford copy is version 2.0, the one the Manchester tutorial now points at: 99 named
classes, a date-independent ontology IRI, and the license and provenance annotations in the
file. Attribution is a condition of CC BY, and the 2.0 file carries it itself.

## The one-time upload (Tim, production SDCStudio)

Semantic Enhancement, Upload Ontology:

| Field | Value |
|---|---|
| File | `docs/tutorial/pizza.owl` |
| Namespace abbreviation | `pizza` |
| Namespace URI | `http://www.co-ode.org/ontologies/pizza/pizza.owl#` |
| Description | The Manchester Pizza tutorial ontology, v2.0, CC BY 3.0 (Drummond, Rector, Horridge, Wroe, Stevens). Uploaded for the SDCBench tutorial "The Pizza Order". |
| Access level | Public |

The namespace URI is the ontology's own IRI, which is what every other pizza.owl user cites.
It is an identifier, not a download address: the co-ode host answers with a redirect today,
and the Stanford URL is a mirror.

## IRIs the tutorial prints

The learner binds the Toppings codes in step 4. Search finds these by label; the tutorial
prints them so the step does not depend on search ranking.

| Code | IRI |
|---|---|
| mozzarella | http://www.co-ode.org/ontologies/pizza/pizza.owl#MozzarellaTopping |
| tomato | http://www.co-ode.org/ontologies/pizza/pizza.owl#TomatoTopping |
| ham | http://www.co-ode.org/ontologies/pizza/pizza.owl#HamTopping |
| mushroom | http://www.co-ode.org/ontologies/pizza/pizza.owl#MushroomTopping |
| olive | http://www.co-ode.org/ontologies/pizza/pizza.owl#OliveTopping |
| pepperoni | http://www.co-ode.org/ontologies/pizza/pizza.owl#PeperoniSausageTopping |
| anchovies | http://www.co-ode.org/ontologies/pizza/pizza.owl#AnchoviesTopping |
| green pepper | http://www.co-ode.org/ontologies/pizza/pizza.owl#GreenPepperTopping |

Bases and sizes have no home in pizza.owl beyond `ThinAndCrispyBase` and `DeepPanBase`;
Size and Crust stay local code lists, which is itself a point the tutorial can make.
