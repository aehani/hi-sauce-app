import FluidGlassBubble from './Fluidglassbubble'

const POSITIONS = [
  { left: '8%',  top: '28%' },
  { left: '56%', top: '12%' },
  { left: '22%', top: '56%' },
  { left: '60%', top: '52%' },
  { left: '38%', top: '30%' },
  { left: '5%',  top: '62%' },
  { left: '68%', top: '74%' },
  { left: '42%', top: '68%' }, // Admin
]

const SIZES = [138, 124, 130, 120, 126, 118, 122, 116]

export default function StaffBubble({ staff, index, onSelect, animDelay = 0, isAdmin = false }) {
  const position = POSITIONS[index] ?? { left: `${10 + (index * 13) % 70}%`, top: `${20 + (index * 17) % 60}%` }
  const size     = SIZES[index] ?? 116

  return (
    <FluidGlassBubble
      size={size}
      name={staff.name}
      subLabel={isAdmin ? 'admin' : 'tap'}
      position={position}
      animDelay={animDelay}
      floatIndex={index}
      onClick={() => onSelect(staff)}
      isAdmin={isAdmin}
    />
  )
}