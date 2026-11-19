import { ActionCard, ModifierCard } from './Card'

export function Rules() {
  return (
    <div className="rules">
      <h3>Goal</h3>
      <p>
        Bank points over several rounds. The game ends after the round in which someone reaches 200
        points, and the highest total wins.
      </p>

      <h3>On your turn</h3>
      <ul>
        <li>
          <strong>Hit</strong> to take another card, or <strong>stay</strong> to bank what you have and
          sit out the rest of the round.
        </li>
        <li>
          Draw a number you already hold and you <strong>bust</strong>: you score nothing this round.
        </li>
        <li>
          Collect seven different numbers to <strong>Flip 7</strong>. The round ends immediately and
          you earn 15 bonus points.
        </li>
      </ul>

      <h3>Scoring a round</h3>
      <ol>
        <li>Add up your number cards.</li>
        <li>
          Double that sum if you hold <ModifierCard id="x2" />.
        </li>
        <li>
          Add your bonus cards (<ModifierCard id="+2" /> to <ModifierCard id="+10" />).
        </li>
        <li>Add 15 if you flipped seven.</li>
      </ol>

      <h3>Action cards</h3>
      <dl className="rules__actions">
        <div>
          <dt>
            <ActionCard id="freeze" /> Freeze
          </dt>
          <dd>The chosen player banks their points and is out of the round.</dd>
        </div>
        <div>
          <dt>
            <ActionCard id="flipThree" /> Flip Three
          </dt>
          <dd>
            The chosen player takes three cards, one at a time, stopping early if they bust or flip
            seven.
          </dd>
        </div>
        <div>
          <dt>
            <ActionCard id="secondChance" /> Second Chance
          </dt>
          <dd>
            Keep it. When you draw a duplicate, discard both cards instead of busting. You can only
            hold one, so pass any extra to another active player.
          </dd>
        </div>
      </dl>

      <h3>The deck</h3>
      <p>
        94 cards: twelve 12s, eleven 11s and so on down to one 1 and a single 0, plus six score
        modifiers and three of each action card. High cards are worth more but are much more likely
        to come up twice.
      </p>
    </div>
  )
}
