import { ExerciseMotion, Limb, Pose } from './exercise-motion';
import { rounded } from './pose-editing';

/**
 * A pose or motion as code to paste into `built-in-exercise-motion.ts`, written with its
 * helpers (`angles()`, `reach()`, `touch()` and `both()`), for the posing tool. Run
 * `npm run format` after pasting, to lay it out.
 */

export function poseCode(pose: Pose): string {
    return literal(pose, '');
}

export function motionCode(motion: ExerciseMotion): string {
    return literal(motion, '');
}

function limbCode(limb: Limb): string {
    if ('angles' in limb) {
        const [upper, lower] = limb.angles.map(rounded);
        return limb.scale
            ? `angles(${upper}, ${lower}, [${limb.scale.map(rounded).join(', ')}])`
            : `angles(${upper}, ${lower})`;
    }
    if ('touch' in limb) {
        return `touch(${limb.touch.map(rounded).join(', ')}, '${limb.bend}')`;
    }
    return limb.reach === 'bar'
        ? `{ reach: 'bar', bend: '${limb.bend}' }`
        : `reach(${limb.reach.map(rounded).join(', ')}, '${limb.bend}')`;
}

function limbPairCode([near, far]: readonly [Limb, Limb]): string {
    const [nearCode, farCode] = [limbCode(near), limbCode(far)];
    return nearCode === farCode ? `both(${nearCode})` : `[${nearCode}, ${farCode}]`;
}

/** Any value, as TypeScript; an object over one line is a property a line. */
function literal(value: unknown, indent: string, key = ''): string {
    if ((key === 'arms' || key === 'legs') && Array.isArray(value)) {
        return limbPairCode(value as unknown as readonly [Limb, Limb]);
    }
    if (typeof value === 'number') {
        return String(rounded(value));
    }
    if (typeof value === 'string') {
        return `'${value.replaceAll("'", "\\'")}'`;
    }
    if (Array.isArray(value)) {
        const items = value.map((item) => literal(item, indent + '    '));
        const inline = `[${items.join(', ')}]`;
        return inline.length <= 60 && !inline.includes('\n')
            ? inline
            : `[\n${items.map((item) => `${indent}    ${item},`).join('\n')}\n${indent}]`;
    }
    if (value && typeof value === 'object') {
        const entries = Object.entries(value).filter(([, each]) => each !== undefined);
        const parts = entries.map(
            ([name, each]) => `${name}: ${literal(each, indent + '    ', name)}`
        );
        const inline = `{ ${parts.join(', ')} }`;
        return inline.length <= 60 && !inline.includes('\n')
            ? inline
            : `{\n${parts.map((part) => `${indent}    ${part},`).join('\n')}\n${indent}}`;
    }
    return String(value);
}
