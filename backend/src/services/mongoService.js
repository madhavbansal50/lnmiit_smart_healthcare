const { MongoClient } = require('mongodb');
const crypto = require('crypto');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/lnmiit_healthcare';
const DB_NAME = process.env.MONGODB_DB_NAME || 'lnmiit_healthcare';

let client = null;
let db = null;

async function getDb() {
  if (!db) {
    client = new MongoClient(MONGODB_URI, {
      maxPoolSize: 20,
      serverSelectionTimeoutMS: 5000
    });
    await client.connect();
    db = client.db(DB_NAME);
    console.log(`[MongoDB] Connected to database: ${db.databaseName} at ${MONGODB_URI}`);
  }
  return db;
}

// Convert Prisma "where" clause into MongoDB filter query
function transformWhere(where) {
  if (!where || typeof where !== 'object') return {};

  const mongoFilter = {};

  for (const [key, val] of Object.entries(where)) {
    if (val === undefined) continue;

    if (key === 'OR' && Array.isArray(val)) {
      const orList = val.map(transformWhere).filter(sub => Object.keys(sub).length > 0);
      if (orList.length > 0) {
        mongoFilter['$or'] = orList;
      }
      continue;
    }

    if (key === 'AND' && Array.isArray(val)) {
      const andList = val.map(transformWhere).filter(sub => Object.keys(sub).length > 0);
      if (andList.length > 0) {
        mongoFilter['$and'] = andList;
      }
      continue;
    }

    if (val === null) {
      mongoFilter[key] = null;
    } else if (typeof val === 'object' && !Array.isArray(val) && !(val instanceof Date)) {
      // Prisma operators: contains, in, not, gte, lte, gt, lt
      const subFilter = {};
      for (const [op, opVal] of Object.entries(val)) {
        if (op === 'contains') {
          const mode = val.mode === 'insensitive' ? 'i' : '';
          subFilter['$regex'] = opVal;
          if (mode) subFilter['$options'] = mode;
        } else if (op === 'in') {
          subFilter['$in'] = opVal;
        } else if (op === 'not') {
          subFilter['$ne'] = opVal;
        } else if (op === 'gte') {
          subFilter['$gte'] = opVal;
        } else if (op === 'lte') {
          subFilter['$lte'] = opVal;
        } else if (op === 'gt') {
          subFilter['$gt'] = opVal;
        } else if (op === 'lt') {
          subFilter['$lt'] = opVal;
        }
      }
      if (Object.keys(subFilter).length > 0) {
        mongoFilter[key] = subFilter;
      }
    } else {
      mongoFilter[key] = val;
    }
  }

  return mongoFilter;
}

// Convert Prisma "orderBy" into MongoDB sort object
function transformOrderBy(orderBy) {
  if (!orderBy) return {};
  const sort = {};
  if (Array.isArray(orderBy)) {
    for (const item of orderBy) {
      for (const [k, v] of Object.entries(item)) {
        sort[k] = v === 'desc' ? -1 : 1;
      }
    }
  } else if (typeof orderBy === 'object') {
    for (const [k, v] of Object.entries(orderBy)) {
      sort[k] = v === 'desc' ? -1 : 1;
    }
  }
  return sort;
}

// Generic Model Handler for any collection
class MongoCollection {
  constructor(modelName) {
    this.name = modelName;
  }

  async getCol() {
    const database = await getDb();
    return database.collection(this.name);
  }

  async findUnique({ where, include } = {}) {
    return this.findFirst({ where, include });
  }

  async findFirst({ where, include, orderBy } = {}) {
    const col = await this.getCol();
    const filter = transformWhere(where);
    const sort = transformOrderBy(orderBy);

    const doc = await col.find(filter).sort(sort).limit(1).next();
    if (!doc) return null;

    return this.populateRelations(doc, include);
  }

  async findMany({ where, include, orderBy, take, skip } = {}) {
    const col = await this.getCol();
    const filter = transformWhere(where);
    const sort = transformOrderBy(orderBy);

    let cursor = col.find(filter);
    if (Object.keys(sort).length > 0) cursor = cursor.sort(sort);
    if (skip) cursor = cursor.skip(skip);
    if (take) cursor = cursor.limit(take);

    const docs = await cursor.toArray();
    if (!include || docs.length === 0) return docs;

    return Promise.all(docs.map((d) => this.populateRelations(d, include)));
  }

  async create({ data }) {
    const col = await this.getCol();
    const now = new Date();
    const id = data.id || crypto.randomUUID();

    // Separate nested Prisma relations to avoid dumping unmapped objects
    const { doctorProfile, studentProfile, ...cleanData } = data;

    const doc = {
      _id: id,
      id,
      ...cleanData,
      createdAt: data.createdAt || now,
      updatedAt: data.updatedAt || now
    };

    await col.insertOne(doc);

    // If nested doctorProfile creation requested
    if (doctorProfile?.create) {
      const docCol = new MongoCollection('doctorProfile');
      const docProfileRecord = await docCol.create({
        data: {
          ...doctorProfile.create,
          userId: id
        }
      });
      doc.doctorProfile = docProfileRecord;
    }

    // If nested studentProfile creation requested
    if (studentProfile?.create) {
      const stuCol = new MongoCollection('studentProfile');
      const stuProfileRecord = await stuCol.create({
        data: {
          ...studentProfile.create,
          userId: id
        }
      });
      doc.studentProfile = stuProfileRecord;
    }

    return doc;
  }

  async update({ where = {}, data = {} } = {}) {
    const col = await this.getCol();
    const filter = transformWhere(where);

    const updateDoc = {};
    const incDoc = {};

    for (const [key, val] of Object.entries(data)) {
      if (val && typeof val === 'object' && val.increment !== undefined) {
        incDoc[key] = val.increment;
      } else {
        updateDoc[key] = val;
      }
    }

    updateDoc.updatedAt = new Date();

    const updateQuery = {};
    if (Object.keys(updateDoc).length > 0) updateQuery.$set = updateDoc;
    if (Object.keys(incDoc).length > 0) updateQuery.$inc = incDoc;

    const res = await col.findOneAndUpdate(filter, updateQuery, { returnDocument: 'after' });
    return res;
  }

  async updateMany({ where = {}, data = {} } = {}) {
    const col = await this.getCol();
    const filter = transformWhere(where);

    const updateDoc = {};
    const incDoc = {};

    for (const [key, val] of Object.entries(data)) {
      if (val && typeof val === 'object' && val.increment !== undefined) {
        incDoc[key] = val.increment;
      } else {
        updateDoc[key] = val;
      }
    }

    updateDoc.updatedAt = new Date();

    const updateQuery = {};
    if (Object.keys(updateDoc).length > 0) updateQuery.$set = updateDoc;
    if (Object.keys(incDoc).length > 0) updateQuery.$inc = incDoc;

    const res = await col.updateMany(filter, updateQuery);
    return { count: res.modifiedCount };
  }

  async upsert({ where = {}, update = {}, create = {} } = {}) {
    const existing = await this.findFirst({ where });
    if (existing) {
      return this.update({ where: { id: existing.id }, data: update });
    }
    return this.create({ data: create });
  }

  async delete({ where = {} } = {}) {
    const col = await this.getCol();
    const filter = transformWhere(where);
    const existing = await col.findOne(filter);
    if (existing) {
      await col.deleteOne(filter);
    }
    return existing;
  }

  async deleteMany({ where } = {}) {
    const col = await this.getCol();
    const filter = transformWhere(where);
    const res = await col.deleteMany(filter);
    return { count: res.deletedCount };
  }

  async count({ where } = {}) {
    const col = await this.getCol();
    const filter = transformWhere(where);
    return col.countDocuments(filter);
  }

  async groupBy({ by, where }) {
    const col = await this.getCol();
    const filter = transformWhere(where);
    const groupField = by[0];

    const pipeline = [
      { $match: filter },
      { $group: { _id: `$${groupField}`, _count: { $sum: 1 } } }
    ];

    const results = await col.aggregate(pipeline).toArray();
    return results.map((r) => ({
      [groupField]: r._id,
      _count: { id: r._count }
    }));
  }

  // Populate related documents matching Prisma's `include` syntax
  async populateRelations(doc, include) {
    if (!include || typeof include !== 'object') return doc;
    const database = await getDb();
    const populated = { ...doc };

    for (const [relation, includeOpt] of Object.entries(include)) {
      if (!includeOpt) continue;

      if (relation === 'user') {
        const userId = doc.userId || doc.id;
        const u = await database.collection('user').findOne({ id: userId });
        populated.user = u;
      } else if (relation === 'studentProfile') {
        const p = await database.collection('studentProfile').findOne({ userId: doc.id });
        if (p && typeof includeOpt === 'object' && includeOpt.include) {
          populated.studentProfile = await new MongoCollection('studentProfile').populateRelations(p, includeOpt.include);
        } else {
          populated.studentProfile = p;
        }
      } else if (relation === 'doctorProfile') {
        const p = await database.collection('doctorProfile').findOne({ userId: doc.id });
        populated.doctorProfile = p;
      } else if (relation === 'student') {
        const s = await database.collection('studentProfile').findOne({ id: doc.studentId });
        if (s) {
          if (typeof includeOpt === 'object' && includeOpt.include) {
            populated.student = await new MongoCollection('studentProfile').populateRelations(s, includeOpt.include);
          } else {
            const u = await database.collection('user').findOne({ id: s.userId });
            populated.student = { ...s, user: u };
          }
        } else {
          populated.student = null;
        }
      } else if (relation === 'doctor') {
        const d = await database.collection('doctorProfile').findOne({ id: doc.doctorId });
        if (d) {
          if (typeof includeOpt === 'object' && includeOpt.include) {
            populated.doctor = await new MongoCollection('doctorProfile').populateRelations(d, includeOpt.include);
          } else {
            const u = await database.collection('user').findOne({ id: d.userId });
            populated.doctor = { ...d, user: u };
          }
        } else {
          populated.doctor = null;
        }
      } else if (relation === '_count') {
        const counts = {};
        if (includeOpt.select?.prescriptions) {
          counts.prescriptions = await database.collection('prescription').countDocuments({ studentId: doc.id });
        }
        if (includeOpt.select?.sessions) {
          counts.sessions = await database.collection('monitoringSession').countDocuments({ studentId: doc.id });
        }
        if (includeOpt.select?.medicalReports) {
          counts.medicalReports = await database.collection('medicalReport').countDocuments({ studentId: doc.id });
        }
        if (includeOpt.select?.clinicalNotes) {
          counts.clinicalNotes = await database.collection('clinicalNote').countDocuments({ studentId: doc.id });
        }
        populated._count = counts;
      } else if (relation === 'healthBaselines') {
        populated.healthBaselines = await database
          .collection('healthBaseline')
          .find({ studentId: doc.id })
          .toArray();
      } else if (relation === 'sessions') {
        populated.sessions = await database
          .collection('monitoringSession')
          .find({ studentId: doc.id })
          .sort({ startTime: -1 })
          .toArray();
      } else if (relation === 'vitals') {
        populated.vitals = await database
          .collection('vitalsReading')
          .find({ sessionId: doc.id })
          .sort({ timestamp: -1 })
          .limit(10)
          .toArray();
      } else if (relation === 'prescriptions') {
        const rawPrescriptions = await database
          .collection('prescription')
          .find({ studentId: doc.id })
          .sort({ createdAt: -1 })
          .toArray();
        populated.prescriptions = await Promise.all(
          rawPrescriptions.map(async (p) => {
            let docInfo = p.doctor;
            if (!docInfo && p.doctorId) {
              const d = await database.collection('doctorProfile').findOne({ id: p.doctorId });
              if (d) {
                const u = await database.collection('user').findOne({ id: d.userId });
                docInfo = { ...d, user: u };
              }
            }
            const normalizedItems = Array.isArray(p.items)
              ? p.items
              : Array.isArray(p.items?.create)
              ? p.items.create
              : [];
            return {
              ...p,
              doctor: docInfo,
              items: normalizedItems
            };
          })
        );
      } else if (relation === 'items') {
        if (doc.items && !Array.isArray(doc.items) && Array.isArray(doc.items.create)) {
          populated.items = doc.items.create;
        } else if (!populated.items) {
          populated.items = [];
        }
      } else if (relation === 'clinicalNotes') {
        populated.clinicalNotes = await database
          .collection('clinicalNote')
          .find({ studentId: doc.id })
          .sort({ createdAt: -1 })
          .toArray();
      } else if (relation === 'device') {
        if (doc.deviceId) {
          populated.device = await database.collection('device').findOne({ id: doc.deviceId });
        }
      }
    }

    return populated;
  }
}

// Proxy object mimicking PrismaClient API powered entirely by MongoDB
const mongoService = {
  user: new MongoCollection('user'),
  doctorProfile: new MongoCollection('doctorProfile'),
  doctorSpecialization: new MongoCollection('doctorSpecialization'),
  studentProfile: new MongoCollection('studentProfile'),
  healthBaseline: new MongoCollection('healthBaseline'),
  monitoringSession: new MongoCollection('monitoringSession'),
  vitalsReading: new MongoCollection('vitalsReading'),
  riskEvent: new MongoCollection('riskEvent'),
  clinicalNote: new MongoCollection('clinicalNote'),
  prescription: new MongoCollection('prescription'),
  medicalReport: new MongoCollection('medicalReport'),
  device: new MongoCollection('device'),
  notification: new MongoCollection('notification'),

  $disconnect: async () => {
    if (client) await client.close();
  },

  getNativeDb: getDb
};

module.exports = mongoService;
