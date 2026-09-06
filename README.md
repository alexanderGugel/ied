ied
===

[![Travis](https://img.shields.io/travis/alexanderGugel/ied.svg)](https://travis-ci.org/alexanderGugel/ied)
[![npm](https://img.shields.io/npm/v/ied.svg)](https://www.npmjs.com/package/ied)
[![Inline docs](http://inch-ci.org/github/alexanderGugel/ied.svg?branch=master&style=shields)](http://inch-ci.org/github/alexanderGugel/ied)

```
__/\\\\\\\\\\\__/\\\\\\\\\\\\\\\__/\\\\\\\\\\\\____
 _\/////\\\///__\/\\\///////////__\/\\\////////\\\__
  _____\/\\\_____\/\\\_____________\/\\\______\//\\\_
   _____\/\\\_____\/\\\\\\\\\\\_____\/\\\_______\/\\\_
    _____\/\\\_____\/\\\///////______\/\\\_______\/\\\_
     _____\/\\\_____\/\\\_____________\/\\\_______\/\\\_
      _____\/\\\_____\/\\\_____________\/\\\_______/\\\__
       __/\\\\\\\\\\\_\/\\\\\\\\\\\\\\\_\/\\\\\\\\\\\\/___
        _\///////////__\///////////////__\////////////_____
```

An alternative package manager for Node.

* **Concurrent Installations** - `ied` installs sub-dependencies in parallel.
  This means that the download of a dependency might have been completed before
  that of its parent or any of its siblings even started.

* **Correct Caching** - Downloaded packages are being cached locally. Similarly
  to the entry dependencies stored in `node_modules`, they are being identified
  by their checksums. Therefore we can guarantee the consistency of the cache
  itself without (manually) invalidating dependencies (e.g. due to overridden
  version numbers).

* **`node_modules` as CAS** - Packages are always being referenced by their
  *SHA-1* checksums. Therefore a `node_modules` directory can be considered to
  be a [Content Addressable
  Storage](https://en.wikipedia.org/wiki/Content-addressable_storage), meaning
  that packages are being identified by their contents, not by arbitrary
  identifiers, such as package names that are not guaranteed to be unique
  across different registries.

* **Flat `node_modules`** - Due to the *CAS*-based design, conflicts due to
  naming collisions are more or less impossible. Therefore all dependencies can
  be stored in a flat directory structure. Circular dependencies and
  dependencies on different versions of the same packages are still being
  handled correctly.

* **Guaranteed uniqueness** - Since the directory in which a specific package
  is being stored is determined by its *shasum*, identical packages can't
  conflict due to their location in the file system itself. This also means
  that the same dependency won't be installed more than once. Dependencies
  don't need to be explicitly declared as `peerDependencies`, since shared
  sub-dependencies are the default, not an option.

* **Atomic installs** - The atomicity of installs can be ensured on a
  *package-level*. "In progress" downloads are being stored in
  `node_modules/.tmp` and moved into `node_modules` once their download has
  been completed. In order to prevent deadlocks, packages that have circular
  dependencies are exempt from this limitation. In most cases however, the
  `node_modules` directory is *consistent* at any given point in time during
  the main installation procedure.

* **Package names as links** - While packages are being referenced by their
  *shasum* internally, they can still be required via their human-readable
  equivalent name. Package names themselves are simply symbolic links to the
  actual content-addressed package itself. A nice side-effect of this design is
  that in contrast to other package managers, you can not accidentally require
  a sub-dependency that hasn't been installed as such.

* **Semantic Versioning** - [Semantic version numbers](http://semver.org/) are
  being resolved correctly.

* **Arbitrary package groups** - Packages can be grouped into "package groups",
  such as `dependencies` and `devDependencies`. Dependencies can be installed
  exclusively based on the group they are in.


Internals
---------

Under the hood, `ied` maintains an "object database", similar to `git`. Instead
of storing packages by some arbitrary name, a SHA1-checksum is being generated
to approximate their contents. The checksums can not only be used for
guaranteeing a certain level of trust and consistency, but they also simplify
the algorithm through which dependencies are being managed.

The algorithm through which packages are being installed guarantees consistency
through atomic installs. The installation of a package either fails or
succeeds, but at no point in time can a dependency itself be required without
having its own sub-dependencies installed (with the exception of shared
circular dependencies).

The checksum of a package is based on the contents of the package itself, not
of its sub-dependencies. Therefore the validity of a package can be verified by
hashing the package itself. Subsequent dependency updates have no effect of the
generated checksum.

Since `node_modules` is essentially a file-system based content addressable
storage, multiple versions of the same package can co-exist in the same
project. In order to expose dependencies via CommonJS, symbolic links are being
created that reference a specific version of the package. This has multiple
advantages:

1. Undeclared dependencies that have been installed as sub-dependencies of
   "direct" dependencies are unlikely to be required "accidentally".

2. There is no need to "manually" (as in additionally to the installation
   procedure itself) de-duplicate the dependency graph. As long as the
   uniqueness of filenames itself can be guaranteed on an OS-level, it is
   *impossible* to install the same package twice. This does not prevent users
   from installing different versions of the same dependency as long as the
   content is different (whereas a different version declared in the
   `package.json` counts as different contents).

3. Shorter pathnames and less problems due to OS-level limitations (as in
   Windows where the maximum path length is limited).

4. Additional application-level startup performance improvements. `require`
   needs to traverse less directories. A limited number of symbolic links need
   to be followed. This performance improvement is primarily useful for
   continuously running tests, where startup time is actually noticeable for
   larger test suits.


### Directory Structure

The used directory structure is primarily optimized for reducing the amount of
IO interaction with the file system during subsequent installations and
guaranteeing the consistency of installed packages.

A consequence of the
[`require.resolve`](https://nodejs.org/api/modules.html#modules_all_together)
algorithm used by Node, all packages need to be stored in a project-level
`node_modules` directory. This directory is completely flat on a package-level,
meaning that there are no nested packages inside it.

Instead each package is being stored in its content-addressed directory. Such a
directory has two sub-directories:

* **package** - This is where the unpacked package contents is being stored. At
  no point in time will this directory be modified. This enables us to verify
  the integrity of the package at a later point in time by comparing the actual
  checksum to the one defined by other dependents or registries.

* **node_modules** - Sub-dependencies of the dependency installed in `package`
  are being referenced by symbolic links in `node_modules` of the package
  itself. `require.resolve` will fall-back to this level after failing to
  locate a dependency in `package`. This means checked in dependencies are
  still supported, provided that their sub-dependencies are also available
  (anywhere in the dependency graph).

On a project level, the `node_modules` directory contains the fetched packages,
installed dependencies and links that expose the packages to user-land via
`require`.

A comparison of sample directory structures produced by ied, npm 2 and npm 3 is
available as a [GitHub
Gist](https://gist.github.com/alexanderGugel/a10ed5655d366875a280).


Why?
----

The original idea was to implement npm's pre-v3 install algorithm in as few
lines as possible. This goal was achieved in
[`c4ba56f`](https://github.com/alexanderGugel/ied/tree/c4ba56f7dece738db5b8cb28c20c7f6aa1e64d1d).

Currently the main goal of this project is to provide a more performant
alternative to npm.


Installation
------------

The easiest way to install ied is using [npm](https://www.npmjs.org/):

```
npm i -g ied
```

Alternatively you can also "bootstrap" ied.
After an initial installation via npm, ied will install its own dependencies:

```
git clone https://github.com/alexanderGugel/ied ied && cd $_ && make install
```

Usage
-----

The goal of `ied` is to support ~ 80 per cent of the npm commands that one uses
on a daily basis. Feature parity with npm **other than** with its installation
process itself is not an immediate goal. Raw performance is the primary concern
during the development process.

A global [configuration](src/config.js) can be supplied via environment
variables. `NODE_DEBUG` can be used in order to debug specific sub-systems. The
progress bar will be disabled in that case.

Although `run-script` is supported, lifecycle scripts are not.

At this point in time, the majority of the command API is
[self-documenting](bin/cmd.js). More extensive documentation will be available
once the API is stabilized.

A high-level [USAGE](USAGE.txt) help is also supplied. The main goal is to
keep the API predictable for regular npm-users. This means certain flags, such
as for example `--save`, `--save-dev`, `--save-optional`, are supported.

```
  ied is a package manager for Node.

  Usage:

    ied [command] [arguments]

  The commands are:

    install     fetch packages and dependencies
    run         run a package.json script
    shell       enter a sub-shell with augmented PATH
    ping        check if the registry is up
    config      print the used config
    init        initialize a new package
    link        link the current package or into it
    unlink      unlink the current package or from it
    start       runs `ied run start`
    stop        runs `ied run stop`
    build       runs `ied run build`
    test        runs `ied run test`

  Flags:
    -h, --help          show usage information
    -v, --version       print the current version
    -S, --save          update package.json dependencies
    -D, --save-dev      update package.json devDependencies
    -O, --save-optional update package.json optionalDependencies
    -r, --registry      use a custom registry
                        (default: http://registry.npmjs.org/)
    -b, --build         execute lifecycle scripts upon completion
                        (e.g. postinstall)

  Example:
    ied install
    ied install <pkg>
    ied install <pkg>@<version>
    ied install <pkg>@<version range>

    Can specify one or more: ied install semver@^5.0.1 tape
    If no argument is supplied, installs dependencies from package.json.
    Sub-commands can also be called via their shorthand aliases.

  README:  https://github.com/alexanderGugel/ied
  ISSUES:  https://github.com/alexanderGugel/ied/issues
```

Development notes
-----------------

To run the test suite, run `npm test`. The test suite mocks all HTTP requests,
with fixtures cached inside `fixtures/generated/`. If you make new tests that
perform HTTP requests, it'll be saved there.

```
npm test
```

Credits
-------

Some ideas and (upcoming) features of `ied` are heavily inspired by
[**Nix**](http://nixos.org/nix/), a purely functional package manager.

License
-------

Licensed under the MIT license. See [LICENSE](LICENSE.md).



## 🌐 Web Resources & Interactive Index
- [ARROW TAP PUZZLE](https://esskillcrafts.pages.dev/arrow-tap-puzzle.html)
- [SORT WATER NOW](https://learnquester.pages.dev/sort-water-now.html)
- [LAST UFO DEFENSE](https://thelearnquester.web.app/last-ufo-defense.html)
- [ITALIAN BRAINROT FIND THE STARS](https://learnquester.pages.dev/italian-brainrot-find-the-stars.html)
- [TOY RUMBLE 3D](https://theskillquest.pages.dev/toy-rumble-3d.html)
- [SNIPER SHOOTER 2](https://themindplaying.web.app/sniper-shooter-2.html)
- [CATEGORY RPG80](https://studyquests.github.io/category-rpg80.html)
- [DREAM PET HOTEL](https://thequizzone.pages.dev/dream-pet-hotel.html)
- [CATEGORY ESCAPE 2](https://quizverses.pages.dev/category-escape-2.html)
- [GEOMETRY SUBZERO](https://studyplaying.github.io/geometry-subzero.html)
- [ROAD OF FURY 4](https://learnquester.pages.dev/road-of-fury-4.html)
- [BALL AND GIRLFRIEND](https://themindplay.github.io/ball-and-girlfriend.html)
- [CATEGORY UNBLOCK](https://themindplays.pages.dev/category-unblock.html)
- [FOREST MATCH 4](https://themindzone.pages.dev/forest-match-4.html)
- [SKIBIDI TOILET VS CAMERAMAN SNIPER GAME](https://learnquester.pages.dev/skibidi-toilet-vs-cameraman-sniper-game.html)
- [CATEGORY STICKMAN 2](https://studyquesthub.web.app/category-stickman-2.html)
- [GEOMETRY STARS](https://thelearnquesters.pages.dev/geometry-stars.html)
- [TRI PEAKS EMERLAND SOLITAIRE](https://thelearnquester.web.app/tri-peaks-emerland-solitaire.html)
- [STICKMAN MINERS WARS](https://thelearnquester.web.app/stickman-miners-wars.html)
- [INDEX7](https://studyplayings.pages.dev/index7.html)
- [ELLIE CHINESE NEW YEAR CELEBRATION](https://themindzone.pages.dev/ellie-chinese-new-year-celebration.html)
- [LABO BRICK TRAIN GAME FOR KIDS](https://studyplaying.github.io/labo-brick-train-game-for-kids.html)
- [CATEGORY INTERSTELLAR](https://learnquester.pages.dev/category-interstellar.html)
- [HIGHSCHOOL MEAN GIRLS 3](https://studyquests.github.io/highschool-mean-girls-3.html)
- [2048 BLOCK FUSION](https://studyquests.github.io/2048-block-fusion.html)
- [CATEGORY TANK](https://thelearnquesters.pages.dev/category-tank.html)
- [ITALIAN BRAINROT TUNG TUNG RACING](https://learnquester.pages.dev/italian-brainrot-tung-tung-racing.html)
- [CARGO PATH PUZZLE](https://theskillquest.pages.dev/cargo-path-puzzle.html)
- [UNCLE BULLET 007](https://themindplay.github.io/uncle-bullet-007.html)
- [HIDDEN OBJECT ADVENTURE](https://themindplays.pages.dev/hidden-object-adventure.html)
- [TILE SORT MATCH 3](https://studyplayings.web.app/tile-sort-match-3.html)
- [CATEGORY BUBBLE SHOOTER](https://learnquester.pages.dev/category-bubble-shooter.html)
- [OFFROAD JEEP GAME SIMULATOR](https://themindplay.github.io/offroad-jeep-game-simulator.html)
- [CAPYBARA SKEWER MATCH](https://thelearnquesters.pages.dev/capybara-skewer-match.html)
- [CATEGORY WAR](https://skillplay.github.io/category-war.html)
- [STRAWBERRY SHORTCAKE](https://studyplayings.web.app/strawberry-shortcake.html)
- [KITTY MATCH 3 PUZZLE GAME](https://iskillquest.pages.dev/kitty-match-3-puzzle-game.html)
- [MERGE BLOCKS 2048 STYLE](https://themindplay.github.io/merge-blocks-2048-style.html)
- [OIL DIGGING](https://thelearnquesters.pages.dev/oil-digging.html)
- [HYPERSPACE   QUANTUM FRACTURE FEZ](https://studyplaying.github.io/hyperspace---quantum-fracture-fez.html)
- [PET SALON SIMULATOR](https://thelearnquesters.pages.dev/pet-salon-simulator.html)
- [HYPER SURVIVE](https://studyquests.github.io/hyper-survive.html)
- [SUSTAINABLE](https://iskillcrafts.web.app/sustainable.html)
- [DREAM ROOM MAKEOVER](https://themindplay.pages.dev/dream-room-makeover.html)
- [GET A COOL GUN](https://studyplayings.pages.dev/get-a-cool-gun.html)
- [DOMINO SMASH 3D](https://iskillcrafts.pages.dev/domino-smash-3d.html)
- [MERGE HOME MANIA](https://ptskillcrafts.pages.dev/merge-home-mania.html)
- [FIGHT TRIVIA](https://themindplay.pages.dev/fight-trivia.html)
- [GRIDDLERS DELUXE](https://themindplay.github.io/griddlers-deluxe.html)
- [SUDOKU GURU CLASSIC SUDOKU](https://thelearnquesters.pages.dev/sudoku-guru-classic-sudoku.html)
- [FIRE SNAKE](https://iskillcrafts.web.app/fire-snake.html)
- [PAINT TILES PUZZLE](https://themindplay.pages.dev/paint-tiles-puzzle.html)
- [CATEGORY SPORTS](https://skillplay.github.io/category-sports.html)
- [CATEGORY CASUAL 15](https://ptskillcrafts.pages.dev/category-casual-15.html)
- [MERGE TIKTOK GRAVITY KNIFE](https://quizverses.github.io/merge-tiktok-gravity-knife.html)
- [COZY KITCHEN MERGE](https://themindplays.pages.dev/cozy-kitchen-merge.html)
- [WATER SORT COLLECTIONS](https://themindplays.pages.dev/water-sort-collections.html)
- [HERO TRANSFORM RUN](https://iskillcrafts.web.app/hero-transform-run.html)
- [FLOWER SORT](https://theskillquest.pages.dev/flower-sort.html)
- [FAMILY SIMULATOR BEACH GAMES](https://enskillcrafts.pages.dev/family-simulator-beach-games.html)
- [CATEGORY ESCAPE 3](https://themindplays.pages.dev/category-escape-3.html)
- [HILL RACING EGG DROP](https://enskillcrafts.pages.dev/hill-racing-egg-drop.html)
- [2248 MUSICAL](https://enskillcrafts.pages.dev/2248-musical.html)
- [SPACEFLIGHT SIMULATOR](https://thelearnquesters.pages.dev/spaceflight-simulator.html)
- [JEWEL SOLITAIRE TRIPEAKS](https://iskillplay.web.app/jewel-solitaire-tripeaks.html)
- [BOMBARDINO CROCODILO TERROR JUMPSCARE](https://studyplayings.pages.dev/bombardino-crocodilo-terror-jumpscare.html)
- [CATEGORY 1 PLAYER139](https://themindplay.pages.dev/category-1-player139.html)
- [WORLD FLAGS TRIVIA](https://enskillcrafts.pages.dev/world-flags-trivia.html)
- [HEAD JUMP](https://quizverses.github.io/head-jump.html)
- [CAT LIFE SIMULATOR](https://studyplaying.github.io/cat-life-simulator.html)
- [PHOTO BLOCK JOURNEY](https://studyquests.pages.dev/photo-block-journey.html)
- [KITTY COUPLE LOVELY VALENTINE](https://enskillcrafts.pages.dev/kitty-couple-lovely-valentine.html)
- [NUBIK CREATE YOUR PLACE](https://enskillcrafts.pages.dev/nubik-create-your-place.html)
- [CATEGORY 3D1 371](https://skillcrafts.github.io/category-3d1-371.html)
- [POP ADVENTURE](https://studyplayings.web.app/pop-adventure.html)
- [PARK ME DRAW PATH](https://enskillcrafts.pages.dev/park-me-draw-path.html)
- [AMONG SQUID CHALLENGE ONLINE](https://iskillcrafts.web.app/among-squid-challenge-online.html)
- [MERMAIDCORE MAKEUP](https://themindplays.pages.dev/mermaidcore-makeup.html)
- [HOMERUN DERBY](https://thelearnquesters.pages.dev/homerun-derby.html)
- [STICKER BOOK PUZZLE COLOR BY NUMBER](https://enskillcrafts.pages.dev/sticker-book-puzzle-color-by-number.html)
- [TIKTOK STREET STYLE](https://themindplays.pages.dev/tiktok-street-style.html)
- [PRIVACY](https://quizverses-9d2f2.web.app/privacy.html)
- [CATEGORY SIDE SCROLLING184](https://themindplay.pages.dev/category-side-scrolling184.html)
- [FAMILY TREE PUZZLE](https://thelearnquesters.pages.dev/family-tree-puzzle.html)
- [RUSSIAN TREASURE HUNTER](https://thelearnquester.web.app/russian-treasure-hunter.html)
- [CROSS THE ROAD](https://enskillcrafts.pages.dev/cross-the-road.html)
- [MY DOGY VIRTUAL PET](https://thelearnquester.web.app/my-dogy-virtual-pet.html)
- [CINEMA EMPIRE IDLE TYCOON](https://thelearnquesters.pages.dev/cinema-empire-idle-tycoon.html)
- [TARCAT](https://learnquester.pages.dev/tarcat.html)
- [SUGAR HEROES](https://themindplay.github.io/sugar-heroes.html)
- [GRANNY PILLS DEFEND CACTUSES](https://enskillcrafts.pages.dev/granny-pills-defend-cactuses.html)
- [SOCCER EURO CUP 2025](https://enskillcrafts.pages.dev/soccer-euro-cup-2025.html)
- [8 BALL POOL BILLIARDS MULTIPLAYER](https://thelearnquesters.pages.dev/8-ball-pool-billiards-multiplayer.html)
- [FANTASY MATH NUMBER](https://enskillcrafts.pages.dev/fantasy-math-number.html)
- [CYBERPUNK AGENT](https://iskillplay.web.app/cyberpunk-agent.html)
- [HOSPITAL GAME HAPPY CLINIC](https://iskillcrafts.web.app/hospital-game-happy-clinic.html)
- [HEXA STACK CHRISTMAS](https://iskillcrafts.web.app/hexa-stack-christmas.html)
- [CATEGORY CASUAL969](https://themindplaying.web.app/category-casual969.html)
- [FISHING FISHES](https://themindplay.pages.dev/fishing-fishes.html)
- [POCKET CAR MASTER](https://quizverses.github.io/pocket-car-master.html)
- [BOUNCEPOP QUEST](https://enskillcrafts.pages.dev/bouncepop-quest.html)
- [LAZY WORKERS](https://enskillcrafts.pages.dev/lazy-workers.html)
- [CATEGORY CASUAL](https://studyplaying.github.io/category-casual.html)
- [WALL HOP](https://enskillcrafts.pages.dev/wall-hop.html)
- [CATEGORY CAT](https://iskillcrafts.web.app/category-cat.html)
- [SPRUNKI GETS SURGERY](https://studyplaying.github.io/sprunki-gets-surgery.html)
- [EMILYS HOTEL SOLITAIRE](https://enskillcrafts.pages.dev/emilys-hotel-solitaire.html)
- [TARCAT](https://quizverses.github.io/tarcat.html)
- [JELLY TOWER CRUSH](https://learnquester.pages.dev/jelly-tower-crush.html)
- [STICKMAN IN SPACE](https://themindzone.pages.dev/stickman-in-space.html)
- [PARK THEM ALL](https://enskillcrafts.pages.dev/park-them-all.html)
- [MY HAPPY FARM](https://learnquester.pages.dev/my-happy-farm.html)
- [UNLOCK THE BOLTS](https://studyplaying.github.io/unlock-the-bolts.html)
- [PIRATE NOOB APOCALYPSE](https://themindplay.github.io/pirate-noob-apocalypse.html)
- [FUN OBBY EXTREME](https://themindplays.pages.dev/fun-obby-extreme.html)
- [HAMSTERCYCLE](https://enskillcrafts.pages.dev/hamstercycle.html)
- [IDLE LAWNMOWER](https://enskillcrafts.pages.dev/idle-lawnmower.html)
- [INDEX24](https://esskillcrafts.pages.dev/index24.html)
- [CATEGORY COLLECT565](https://studyplayings.web.app/category-collect565.html)
- [WONDERS OF EGYPT MATCH](https://frskillcrafts.pages.dev/wonders-of-egypt-match.html)
- [BOOM STICK BAZOOKA](https://quizverses.github.io/boom-stick-bazooka.html)
- [CATEGORY FUN MAKEUP GAMES](https://esskillcrafts.pages.dev/category-fun-makeup-games.html)
- [SAND BLAST BLOCK GAME](https://iskillcrafts.web.app/sand-blast-block-game.html)
- [CATEGORY BATTLE ROYALE25](https://esskillcrafts.pages.dev/category-battle-royale25.html)
- [FRUIT SORT LOGIC](https://studyplayings.pages.dev/fruit-sort-logic.html)
- [CATEGORY CAR](https://themindplaying.web.app/category-car.html)
- [SKY BLOCK BOUNCE](https://iskillcrafts.web.app/sky-block-bounce.html)
- [WE ARE IN A SIMULATION SIMULATOR](https://skillcrafts.github.io/we-are-in-a-simulation-simulator.html)
- [DINO GAME](https://frskillcrafts.pages.dev/dino-game.html)
- [OBBY TSUNAMI ESCAPE 1 BY CAR](https://skillcrafts.github.io/obby-tsunami-escape-1-by-car.html)
