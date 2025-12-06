import express from 'express';
import { prisma } from '../lib/prisma.js';
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth.js';
import {
  calculateTeamKPI,
  calculateOfficeKPI,
  calculateCityKPI,
  calculateCountryKPI,
  RealtorData,
} from '../utils/kpiCalculations.js';

const router = express.Router();

// Helper function to fetch realtor data with deals and diagnoses
async function fetchRealtorData(realtorIds: string[]): Promise<RealtorData[]> {
  const realtorsData: RealtorData[] = [];

  for (const realtorId of realtorIds) {
    const realtor = await prisma.realtor.findUnique({
      where: { id: realtorId },
      select: { id: true, level: true }
    });

    if (realtor) {
      const [deals, diagnoses] = await Promise.all([
        prisma.deal.findMany({
          where: { realtorId: realtor.id },
          select: { dealValue: true, dealDate: true }
        }),
        prisma.diagnosis.findMany({
          where: { realtorId: realtor.id },
          select: { diagnosisDate: true }
        })
      ]);

      realtorsData.push({
        id: realtor.id,
        level: realtor.level,
        deals: deals.map(d => ({
          deal_value: d.dealValue.toString(),
          deal_date: d.dealDate.toISOString().split('T')[0]
        })),
        diagnoses: diagnoses.map(d => ({
          diagnosis_date: d.diagnosisDate.toISOString().split('T')[0]
        }))
      });
    }
  }

  return realtorsData;
}

// Get KPI for realtor
router.get('/realtor/:realtorId', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { realtorId } = req.params;
    const realtor = await prisma.realtor.findUnique({
      where: { id: realtorId },
      select: { id: true, level: true }
    });

    if (!realtor) {
      return res.status(404).json({ error: 'Realtor not found' });
    }

    const realtorsData = await fetchRealtorData([realtor.id]);
    if (realtorsData.length === 0) {
      return res.json({
        realtors: 1,
        deals: 0,
        diagnoses: 0,
        successRate: 0,
        totalDealValue: 0,
        levelDistribution: {}
      });
    }

    const kpi = calculateTeamKPI(realtorsData);
    res.json(kpi);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

// Get KPI for team
router.get('/team/:teamId', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { teamId } = req.params;
    const realtors = await prisma.realtor.findMany({
      where: { teamId },
      select: { id: true }
    });

    const realtorsData = await fetchRealtorData(realtors.map(r => r.id));
    const kpi = calculateTeamKPI(realtorsData);

    res.json(kpi);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

// Get KPI for office
router.get('/office/:officeId', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { officeId } = req.params;
    const teams = await prisma.team.findMany({
      where: { officeId },
      select: { id: true }
    });

    const allRealtorIds: string[] = [];
    for (const team of teams) {
      const realtors = await prisma.realtor.findMany({
        where: { teamId: team.id },
        select: { id: true }
      });
      allRealtorIds.push(...realtors.map(r => r.id));
    }

    const teamRealtors: RealtorData[][] = [];
    for (const team of teams) {
      const realtors = await prisma.realtor.findMany({
        where: { teamId: team.id },
        select: { id: true }
      });
      const realtorsData = await fetchRealtorData(realtors.map(r => r.id));
      teamRealtors.push(realtorsData);
    }

    const kpi = calculateOfficeKPI(teamRealtors);
    res.json(kpi);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

// Get KPI for city
router.get('/city/:cityId', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { cityId } = req.params;
    const offices = await prisma.office.findMany({
      where: { cityId },
      select: { id: true }
    });

    const officeRealtors: RealtorData[][] = [];
    for (const office of offices) {
      const teams = await prisma.team.findMany({
        where: { officeId: office.id },
        select: { id: true }
      });

      const allRealtorIds: string[] = [];
      for (const team of teams) {
        const realtors = await prisma.realtor.findMany({
          where: { teamId: team.id },
          select: { id: true }
        });
        allRealtorIds.push(...realtors.map(r => r.id));
      }

      const realtorsData = await fetchRealtorData(allRealtorIds);
      officeRealtors.push(realtorsData);
    }

    const kpi = calculateCityKPI(officeRealtors);
    res.json(kpi);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

// Get KPI for country
router.get('/country/:countryId', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { countryId } = req.params;
    const cities = await prisma.city.findMany({
      where: { countryId },
      select: { id: true }
    });

    const cityRealtors: RealtorData[][] = [];
    for (const city of cities) {
      const offices = await prisma.office.findMany({
        where: { cityId: city.id },
        select: { id: true }
      });

      const allRealtorIds: string[] = [];
      for (const office of offices) {
        const teams = await prisma.team.findMany({
          where: { officeId: office.id },
          select: { id: true }
        });

        for (const team of teams) {
          const realtors = await prisma.realtor.findMany({
            where: { teamId: team.id },
            select: { id: true }
          });
          allRealtorIds.push(...realtors.map(r => r.id));
        }
      }

      const realtorsData = await fetchRealtorData(allRealtorIds);
      cityRealtors.push(realtorsData);
    }

    const kpi = calculateCountryKPI(cityRealtors);
    res.json(kpi);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

export default router;


