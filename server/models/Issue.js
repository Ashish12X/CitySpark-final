import mongoose from 'mongoose';

const CommentSchema = new mongoose.Schema(
  {
    id: { type: Number, required: true },
    text: String,
    authorId: mongoose.Schema.Types.Mixed,
    authorName: String,
    timestamp: String,
  },
  { _id: false }
);

const IssueSchema = new mongoose.Schema(
  {
    id: { type: Number, required: true, unique: true, index: true },
    title: String,
    titles: { type: mongoose.Schema.Types.Mixed, default: undefined },
    description: String,
    descriptions: { type: mongoose.Schema.Types.Mixed, default: undefined },
    category: String,
    location: String,
    progress: { type: String, default: 'Reported' },
    upvotes: { type: Number, default: 0 },
    downvotes: { type: Number, default: 0 },
    authorId: mongoose.Schema.Types.Mixed,
    lat: Number,
    lng: Number,
    img: String,
    voteMap: { type: Object, default: {} },
    comments: { type: [CommentSchema], default: [] },
    
    // Industry Level Features
    priorityScore: { type: Number, default: 0 },
    priorityLabel: { type: String, default: 'Low' },
    department: String,
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    deadline: Date,
    prediction: { type: mongoose.Schema.Types.Mixed },
    escalation: { type: mongoose.Schema.Types.Mixed },
    verificationStatus: { type: String, enum: ['Pending', 'Verified', 'Rejected'], default: 'Pending' },
    completionImg: String,
    isRepeat: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const Issue = mongoose.model('Issue', IssueSchema);
