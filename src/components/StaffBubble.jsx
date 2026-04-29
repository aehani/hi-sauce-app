import FluidGlassBubble from './Fluidglassbubble'

const POSITIONS = [
  { left: '8%',  top: '30%' },
  { left: '56%', top: '16%' },
  { left: '22%', top: '60%' },
  { left: '60%', top: '57%' },
]
const SIZES = [138, 124, 130, 120]

export default function StaffBubble({ staff, index, onSelect, animDelay = 0 }) {
  return (
    <FluidGlassBubble
      size={SIZES[index]}
      name={staff.name}
      subLabel="tap"
      position={POSITIONS[index]}
      animDelay={animDelay}
      floatIndex={index}
      onClick={() => onSelect(staff)}
    />
  )
}