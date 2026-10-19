import {
  createElement, Paintbrush, Hand, Undo2, Redo2, Minus, Plus, Eye,
  Search, Camera, ImagePlus, Images, ArrowLeft, ArrowRight, Check,
  RotateCcw, X, House, Flower2, Sun, Grid2X2, Ellipsis, Asterisk, Star, Sparkles,
} from 'lucide';

const icons = { Paintbrush, Hand, Undo2, Redo2, Minus, Plus, Eye, Search,
  Camera, ImagePlus, Images, ArrowLeft, ArrowRight, Check, RotateCcw,
  X, House, Flower2, Sun, Grid2X2, Ellipsis, Asterisk, Star, Sparkles };

export function icon(name) {
  return createElement(icons[name], {
    class: 'icon', width: 24, height: 24, 'stroke-width': 2.25,
    'aria-hidden': 'true', focusable: 'false',
  }).outerHTML;
}
