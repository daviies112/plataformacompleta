import { LabelColor } from '@/types/kanban';

export const labelColorClasses: Record<LabelColor, string> = {
  green: 'bg-label-green hover:bg-label-green/80',
  yellow: 'bg-label-yellow hover:bg-label-yellow/80',
  orange: 'bg-label-orange hover:bg-label-orange/80',
  red: 'bg-label-red hover:bg-label-red/80',
  purple: 'bg-label-purple hover:bg-label-purple/80',
  blue: 'bg-label-blue hover:bg-label-blue/80',
  sky: 'bg-label-sky hover:bg-label-sky/80',
  lime: 'bg-label-lime hover:bg-label-lime/80',
  pink: 'bg-label-pink hover:bg-label-pink/80',
  black: 'bg-label-black hover:bg-label-black/80',
};

export const labelColorClassesWithOpacity: Record<LabelColor, string> = {
  green: 'bg-label-green/20 text-label-green',
  yellow: 'bg-label-yellow/20 text-label-yellow',
  orange: 'bg-label-orange/20 text-label-orange',
  red: 'bg-label-red/20 text-label-red',
  purple: 'bg-label-purple/20 text-label-purple',
  blue: 'bg-label-blue/20 text-label-blue',
  sky: 'bg-label-sky/20 text-label-sky',
  lime: 'bg-label-lime/20 text-label-lime',
  pink: 'bg-label-pink/20 text-label-pink',
  black: 'bg-label-black/20 text-label-black',
};

export const coverButtonColorClasses: Record<LabelColor, string> = {
  green: 'bg-label-green',
  yellow: 'bg-label-yellow',
  orange: 'bg-label-orange',
  red: 'bg-label-red',
  purple: 'bg-label-purple',
  blue: 'bg-label-blue',
  sky: 'bg-label-sky',
  lime: 'bg-label-lime',
  pink: 'bg-label-pink',
  black: 'bg-label-black',
};
